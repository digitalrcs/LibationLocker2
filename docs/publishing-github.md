<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Publishing To GitHub

The generated source archive is designed for a new **Libation Locker 2 Server Edition** repository. Keep the `Server Edition` wording in the repository description and About section so it is not confused with the separate ESP32 firmware project.

## Publish The Source Repository

1. Create an empty GitHub repository without an auto-generated README, license, or `.gitignore`.
2. Extract `artifacts/LibationLocker2-<version>-github.zip` into a clean working directory.
3. Keep the MIT `LICENSE` file in the repository so redistributed copies retain credit for Daniel Roberts and DigitalRCS.
4. Initialize Git, add the files, commit, and push to the new repository.
5. Add repository topics such as `aspnet-core`, `dotnet`, `sql-server`, `inventory`, `lm-studio`, and `server-edition`.
6. Verify that the rendered README displays both screenshots and the DigitalRCS logo.

## Publish The Wiki

GitHub stores wiki content in a separate `<repository>.wiki.git` repository. Enable the Wiki feature, create the first wiki page in GitHub, then clone the wiki repository and copy the contents of this project's `wiki` directory into its root. Commit and push those files separately.

The wiki image references expect `assets/digitalrcs-logo.png` to remain in the wiki repository.

## Release Assets

Use `scripts/Publish.ps1` to create framework-dependent application files under `artifacts/publish/LibationLocker`. Package that folder separately as a GitHub Release asset if distributing runnable builds. Do not add production connection strings, environment files, Data Protection keys, logs, exports, or database backups.

Before each release, run:

```powershell
dotnet build .\src\LibationLocker.Web\LibationLocker.Web.csproj -c Release
.\scripts\New-GitHubPackage.ps1 -Version "<version>"
```

The package command runs `scripts/Test-PublicPackage.ps1` and stops if it finds excluded runtime directories, production settings, private IP addresses, or embedded SQL credentials.
