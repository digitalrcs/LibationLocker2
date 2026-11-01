using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using LibationLocker.Web.Models;

namespace LibationLocker.Web.Services;

public sealed class AiJobService(IServiceScopeFactory scopeFactory, IHttpClientFactory httpClientFactory)
{
    private const int AvailabilityTimeoutSec = 5;
    private readonly object _gate = new();
    private AiJobStatusDto _status = new() { Done = true, Ok = true };

    public (bool Started, string Token, AiJobStatusDto? Existing) StartTest(CancellationToken cancellationToken) =>
        StartJob("test", "Reply with exactly: Libation Locker AI test ok", false, "general", cancellationToken);

    public (bool Started, string Token, AiJobStatusDto? Existing) StartAsk(AiAskRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
        {
            throw new ArgumentException("missing_question");
        }

        return StartJob("ask", request.Question.Trim(), request.IncludeInventory, request.Mode, cancellationToken);
    }

    public AiJobStatusDto GetStatus()
    {
        lock (_gate)
        {
            return _status;
        }
    }

    public async Task<AiAvailabilityDto> CheckAvailabilityAsync(AiConfigDto ai, CancellationToken cancellationToken)
    {
        var baseUrl = string.IsNullOrWhiteSpace(ai.BaseUrl) ? DefaultBaseUrl(ai.Provider) : ai.BaseUrl.TrimEnd('/');
        if (!ai.Enabled)
        {
            return new AiAvailabilityDto
            {
                Enabled = false,
                Online = false,
                Provider = ai.Provider,
                BaseUrl = baseUrl,
                TimeoutSec = ai.TimeoutSec,
                Status = "disabled"
            };
        }

        if (string.Equals(ai.Provider, "anthropic", StringComparison.OrdinalIgnoreCase))
        {
            return new AiAvailabilityDto
            {
                Enabled = true,
                Online = !string.IsNullOrWhiteSpace(ai.ApiKey),
                Provider = ai.Provider,
                BaseUrl = baseUrl,
                TimeoutSec = ai.TimeoutSec,
                Status = string.IsNullOrWhiteSpace(ai.ApiKey) ? "missing_api_key" : "configured"
            };
        }

        try
        {
            var models = await ListOpenAiCompatibleModelsAsync(ai, baseUrl, AvailabilityTimeoutSec, cancellationToken);
            return new AiAvailabilityDto
            {
                Enabled = true,
                Online = true,
                Provider = ai.Provider,
                BaseUrl = baseUrl,
                TimeoutSec = ai.TimeoutSec,
                ModelCount = models.Count,
                Status = "online"
            };
        }
        catch (Exception ex)
        {
            return new AiAvailabilityDto
            {
                Enabled = true,
                Online = false,
                Provider = ai.Provider,
                BaseUrl = baseUrl,
                TimeoutSec = ai.TimeoutSec,
                Status = "offline",
                Error = ex.Message
            };
        }
    }

    public async Task<IReadOnlyList<string>> ListModelsAsync(AiConfigDto ai, CancellationToken cancellationToken)
    {
        if (string.Equals(ai.Provider, "anthropic", StringComparison.OrdinalIgnoreCase))
        {
            return string.IsNullOrWhiteSpace(ai.Model)
                ? ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"]
                : [ai.Model, "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"];
        }

        var baseUrl = string.IsNullOrWhiteSpace(ai.BaseUrl) ? DefaultBaseUrl(ai.Provider) : ai.BaseUrl.TrimEnd('/');
        return await ListOpenAiCompatibleModelsAsync(ai, baseUrl, Math.Clamp(ai.TimeoutSec, 10, 60), cancellationToken);
    }

    private async Task<IReadOnlyList<string>> ListOpenAiCompatibleModelsAsync(AiConfigDto ai, string baseUrl, int timeoutSec, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(timeoutSec));

        var client = httpClientFactory.CreateClient("ai");
        if (!string.IsNullOrWhiteSpace(ai.ApiKey))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ai.ApiKey);
        }

        using var response = await client.GetAsync($"{baseUrl}/v1/models", timeout.Token);
        var body = await response.Content.ReadAsStringAsync(timeout.Token);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return data.EnumerateArray()
            .Select(model => model.TryGetProperty("id", out var id) ? id.GetString() : null)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(id => id, StringComparer.OrdinalIgnoreCase)
            .Cast<string>()
            .ToArray();
    }

    private (bool Started, string Token, AiJobStatusDto? Existing) StartJob(string kind, string question, bool includeInventory, string mode, CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            if (_status.Busy)
            {
                return (false, _status.Token, _status);
            }

            var token = $"{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{Guid.NewGuid():N}"[..18];
            _status = new AiJobStatusDto
            {
                Busy = true,
                Done = false,
                Ok = false,
                Token = token,
                Kind = kind,
                InventoryIncluded = includeInventory,
                ModeUsed = mode,
                StartedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            _ = Task.Run(() => RunJobAsync(token, kind, question, includeInventory, mode, CancellationToken.None), CancellationToken.None);
            return (true, token, null);
        }
    }

    private async Task RunJobAsync(string token, string kind, string question, bool includeInventory, string mode, CancellationToken cancellationToken)
    {
        var started = Stopwatch.StartNew();
        var configuredTimeoutSec = 0;
        try
        {
            using var scope = scopeFactory.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<global::LibationLocker.Web.Data.ILibationLockerRepository>();
            var config = await repository.GetConfigAsync(cancellationToken);
            configuredTimeoutSec = config.Ai.TimeoutSec;
            if (!config.Ai.Enabled)
            {
                Complete(token, false, 400, null, "AI is disabled in configuration.", includeInventory, 0, 0, mode);
                return;
            }

            var items = includeInventory ? await repository.GetItemsAsync(cancellationToken) : [];
            var selectedMode = config.Ai.Modes.FirstOrDefault(m => string.Equals(m.Id, mode, StringComparison.OrdinalIgnoreCase))
                ?? config.Ai.Modes.FirstOrDefault()
                ?? AiConfigDto.DefaultAiModes[0];

            var answer = await AskProviderAsync(config.Ai, selectedMode, question, items, kind, cancellationToken);
            Complete(token, true, 200, answer, null, includeInventory, items.Count, items.Count, selectedMode.Id);
        }
        catch (OperationCanceledException) when (configuredTimeoutSec > 0)
        {
            Complete(token, false, 504, null, $"AI provider did not respond within the configured {configuredTimeoutSec} seconds.", includeInventory, 0, 0, mode);
        }
        catch (Exception ex)
        {
            Complete(token, false, 500, null, ex.Message, includeInventory, 0, 0, mode);
        }
        finally
        {
            started.Stop();
        }
    }

    private async Task<string> AskProviderAsync(AiConfigDto ai, AiModeDto mode, string question, IReadOnlyList<ItemDto> items, string kind, CancellationToken cancellationToken)
    {
        var baseUrl = string.IsNullOrWhiteSpace(ai.BaseUrl) ? DefaultBaseUrl(ai.Provider) : ai.BaseUrl.TrimEnd('/');
        var prompt = BuildPrompt(mode, question, items);

        if (string.Equals(ai.Provider, "anthropic", StringComparison.OrdinalIgnoreCase))
        {
            return await AskAnthropicAsync(ai, baseUrl, prompt, cancellationToken);
        }

        return await AskOpenAiCompatibleAsync(ai, baseUrl, prompt, cancellationToken);
    }

    private async Task<string> AskOpenAiCompatibleAsync(AiConfigDto ai, string baseUrl, string prompt, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(ai.TimeoutSec));

        var client = httpClientFactory.CreateClient("ai");
        if (!string.IsNullOrWhiteSpace(ai.ApiKey))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ai.ApiKey);
        }

        var payload = new
        {
            model = ai.Model,
            messages = new[]
            {
                new { role = "system", content = string.IsNullOrWhiteSpace(ai.SystemPrompt) ? "You are a practical bartender assistant for Libation Locker." : ai.SystemPrompt },
                new { role = "user", content = prompt }
            },
            temperature = ai.Temperature,
            max_tokens = ai.MaxTokens > 0 ? ai.MaxTokens : (int?)null,
            reasoning_effort = ai.DisableThinking
                && string.Equals(ai.Provider, "lmstudio", StringComparison.OrdinalIgnoreCase)
                    ? "none"
                    : null,
            stream = ai.StreamingEnabled
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/chat/completions")
        {
            Content = Json(payload)
        };
        using var response = await client.SendAsync(
            request,
            ai.StreamingEnabled ? HttpCompletionOption.ResponseHeadersRead : HttpCompletionOption.ResponseContentRead,
            timeout.Token);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(timeout.Token);
            EnsureProviderSuccess(response, errorBody);
        }

        if (ai.StreamingEnabled)
        {
            return await ReadOpenAiStreamAsync(response, timeout.Token);
        }

        var body = await response.Content.ReadAsStringAsync(timeout.Token);
        EnsureProviderSuccess(response, body);

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
    }

    private static async Task<string> ReadOpenAiStreamAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var answer = new StringBuilder();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (await reader.ReadLineAsync(cancellationToken) is { } line)
        {
            if (!line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var data = line[5..].Trim();
            if (data.Length == 0 || data == "[DONE]")
            {
                if (data == "[DONE]") break;
                continue;
            }

            using var doc = JsonDocument.Parse(data);
            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
            {
                continue;
            }

            var choice = choices[0];
            if (choice.TryGetProperty("delta", out var delta)
                && delta.TryGetProperty("content", out var content)
                && content.ValueKind == JsonValueKind.String)
            {
                answer.Append(content.GetString());
            }
        }

        return answer.ToString();
    }

    private async Task<string> AskAnthropicAsync(AiConfigDto ai, string baseUrl, string prompt, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(ai.TimeoutSec));

        var client = httpClientFactory.CreateClient("ai");
        client.DefaultRequestHeaders.Add("x-api-key", ai.ApiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var payload = new
        {
            model = ai.Model,
            max_tokens = ai.MaxTokens > 0 ? ai.MaxTokens : (int?)null,
            temperature = ai.Temperature,
            system = string.IsNullOrWhiteSpace(ai.SystemPrompt) ? "You are a practical bartender assistant for Libation Locker." : ai.SystemPrompt,
            messages = new[] { new { role = "user", content = prompt } }
        };

        using var response = await client.PostAsync($"{baseUrl}/v1/messages", Json(payload), timeout.Token);
        var body = await response.Content.ReadAsStringAsync(timeout.Token);
        EnsureProviderSuccess(response, body);

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
    }

    private static string BuildPrompt(AiModeDto mode, string question, IReadOnlyList<ItemDto> items)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Mode: {mode.Label}");
        sb.AppendLine($"Instruction: {mode.Instruction}");
        sb.AppendLine($"Question: {question}");
        if (items.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Inventory snapshot:");
            foreach (var item in items.OrderBy(i => i.Type).ThenBy(i => i.Brand).ThenBy(i => i.Name))
            {
                sb.Append(item.Type).Append('|').Append(item.Brand).Append('|').Append(item.Name)
                    .Append('|').Append(item.SizeMl).Append("ml|").Append(item.Abv?.ToString("0.##") ?? "")
                    .Append("|qty=").Append(item.Qty).Append("|remain=").Append(item.RemainingPct)
                    .Append("|need=").Append(item.NeedToBuy ? "yes" : "no");
                if (item.Tags.Length > 0) sb.Append("|tags=").Append(string.Join(',', item.Tags));
                sb.AppendLine();
            }
        }

        if (mode.RestrictToInventory)
        {
            sb.AppendLine("Use only the supplied inventory when recommending items or drinks.");
        }

        return sb.ToString();
    }

    private void Complete(string token, bool ok, int httpCode, string? answer, string? error, bool includedInventory, int itemCount, int totalItems, string mode)
    {
        lock (_gate)
        {
            if (_status.Token != token)
            {
                return;
            }

            _status = _status with
            {
                Busy = false,
                Done = true,
                Ok = ok,
                HttpCode = httpCode,
                Answer = answer,
                Error = error,
                FinishedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                InventoryIncluded = includedInventory,
                InventoryItemCount = itemCount,
                InventoryTotalItems = totalItems,
                ModeUsed = mode
            };
        }
    }

    private static string DefaultBaseUrl(string provider) =>
        string.Equals(provider, "openai", StringComparison.OrdinalIgnoreCase) ? "https://api.openai.com" :
        string.Equals(provider, "anthropic", StringComparison.OrdinalIgnoreCase) ? "https://api.anthropic.com" :
        "http://127.0.0.1:1234";

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        }), Encoding.UTF8, "application/json");

    private static void EnsureProviderSuccess(HttpResponseMessage response, string body)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var detail = body.Trim();
        if (detail.Length > 500)
        {
            detail = detail[..500];
        }

        var message = $"AI provider returned {(int)response.StatusCode} ({response.ReasonPhrase}).";
        if (!string.IsNullOrWhiteSpace(detail))
        {
            message += $" {detail}";
        }

        throw new HttpRequestException(message, null, response.StatusCode);
    }
}
