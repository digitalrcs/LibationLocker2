<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# LM Studio Integration

AI is optional and disabled in a new database. Libation Locker supports LM Studio and other OpenAI-compatible endpoints that provide model discovery and chat completions.

## Configure

1. Start the LM Studio local server and load a model.
2. Sign in as an administrator.
3. Open **Admin > AI Provider**.
4. Enable AI and select `LM Studio`.
5. Enter the endpoint, normally `http://127.0.0.1:1234` when LM Studio runs on the same computer.
6. Select **Refresh Models**, choose a model, and test the connection.
7. Set the request timeout for the model and hardware in use.

For LM Studio, a max-token value of `0` omits `max_tokens` and lets the model/server configuration decide. The application uses a named HTTP client without the default 100-second cutoff; each request is controlled by the configured AI timeout.

## Privacy Boundary

When **Include inventory snapshot** is enabled, inventory data is sent to the configured AI endpoint. Use only an endpoint and network you trust. An empty API key is normal for a local LM Studio server; remote providers may require one.

## Availability Indicator

The header displays `AI: online`, `AI: offline`, or `AI: disabled`. Availability uses a short model-list probe and is separate from a full generation request.

## Troubleshooting

- Confirm the LM Studio server is listening on the configured interface and port.
- Confirm the selected model is loaded and appears in the model list.
- Increase the application timeout for large or slow models.
- Check host firewalls when LM Studio is on another machine.
- Keep TLS certificate validation enabled for remote HTTPS endpoints unless a trusted private environment requires otherwise.
