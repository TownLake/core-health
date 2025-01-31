# core-health

Core-Health is a tool that you can deploy using Cloudflare to review the health metrics that most matter to you. The [example](https://health.samrhea.com/) is deliberately public, but you can secure yours behind Cloudflare Access to keep everything entirely private.

This project consists of:
* a dashboard to display health analytics captured from an Oura ring and Withings devices,
* data capture tools to get your data from the APIs of those services and store it into Cloudflare's D1 database offering,
* and an integration with Cloudflare Workers AI to review your daily snapshot.

### How to get started

1) Clone or fork this repo.
2) Optional: manually capture historical data with your GitHub actions (or import it directly into Cloudflare D1).
3) Replace the GitHub action secrets with yours.
4) Create a new Cloudflare Pages project and connect it to your cloned/forked repo.
5) Update the Cloudflare Pages secrets with your own (including Cloudflare's AI Gateway if you choose to use that as your AI provider).

### Known issues

* The Withings refresh token flow fails randomly. I have not been able to figure out why.
