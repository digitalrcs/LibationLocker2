<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Publishing

Publish this source as **Libation Locker 2 Server Edition** so users can distinguish it from the separate ESP32 firmware repository.

The main source repository contains the application, database scripts, documentation, and demo seed. GitHub stores wiki pages separately in `<repository>.wiki.git`; copy this `wiki` directory into that repository after enabling the Wiki feature.

Run `scripts/New-GitHubPackage.ps1` before publishing. Its public-package audit rejects production settings, runtime data, build output, private IP addresses, known private login values, and embedded SQL credentials.

The project uses the MIT License. Keep the `LICENSE` file with redistributed copies so the copyright notice continues to credit Daniel Roberts and DigitalRCS.
