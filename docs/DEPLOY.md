# Deployment

Both options below cost nothing for a personal, non-commercial site.

## Vercel (recommended)

The Hobby plan is free and is for non-commercial use under Vercel's terms. Next.js runs there with no extra configuration.

1. Create a GitHub repository and push this project:
   ```bash
   git add -A
   ```
   ```bash
   git commit -m "Initial commit"
   ```
   ```bash
   git remote add origin https://github.com/YOUR-NAME/free-movie-finder.git
   ```
   ```bash
   git push -u origin main
   ```
2. Go to https://vercel.com/new and import the repository. Leave the framework preset on Next.js.
3. Under **Settings > Environment Variables** add:
   - `TMDB_READ_TOKEN` (Production and Preview)
   - `DEFAULT_REGION`, for example `US` or `GB`
   - `REVALIDATE_SECRET` (any long random string)
   - `NEXT_PUBLIC_SITE_URL`, your final URL
   - `SITE_OPERATOR_NAME`, `SITE_CONTACT_EMAIL`, `SITE_HOSTING_PROVIDER`, `SITE_GOVERNING_LAW`, `SITE_LEGAL_EFFECTIVE_DATE` (fill in the Privacy and Terms pages)
4. Redeploy so the variables take effect.
5. **Settings > Domains**: add your domain and follow the DNS instructions. The default `*.vercel.app` address is fine for testing but not for launch.

## Netlify

Netlify's free plan also runs Next.js through its built-in Next.js runtime.

1. Import the repository at https://app.netlify.com/start.
2. Build command `npm run build`. Netlify detects Next.js and sets the rest.
3. Add the same environment variables under **Site configuration > Environment variables**.
4. Connect your domain under **Domain management**.

## Weekly data refresh

The workflow in `.github/workflows/refresh-catalog.yml` runs every Monday, and can be started by hand from the Actions tab.

To let it clear the live site's cache after a refresh, add in GitHub **Settings > Secrets and variables > Actions**:
- Variable `SITE_URL`: `https://your-domain.example`
- Secret `REVALIDATE_SECRET`: the same value as on the host

Clear the availability cache yourself at any time:

```bash
curl -X POST https://your-domain.example/api/revalidate -H "Authorization: Bearer $REVALIDATE_SECRET"
```

## Monitoring

`GET /api/health` returns the mode (`full` or `demo`), the catalog's age, and `stale: true` when it is over 14 days old. A free uptime checker (for example UptimeRobot's free plan) can alert you on a keyword like `"stale":true`.

## Cost notes

- TMDB: free for non-commercial use, about 40 to 50 requests per second allowed. Caching keeps normal traffic far below that.
- Posters load straight from TMDB's and Wikimedia's image servers, so the site uses no image-optimization quota.
- No database, no paid services.
