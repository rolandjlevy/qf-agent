# Changing the app password

`APP_PASSWORD` is the shared password for the app pages and API (`lib/auth.js`). On Vercel it's stored as a
Sensitive variable with two entries, Production and Preview, so the dashboard never shows its value. Run these in
your own terminal from the project folder, so the new password isn't typed anywhere else.

## Update it

Each command asks for the new value. Use the same password for both.

```
vercel env update APP_PASSWORD production
vercel env update APP_PASSWORD preview
```

## If `update` refuses: remove and add it again

```
vercel env rm APP_PASSWORD --yes
vercel env add APP_PASSWORD production --sensitive
vercel env add APP_PASSWORD preview --sensitive
```

## Check it's there (shows names only, never the value)

```
vercel env ls | grep APP_PASSWORD
```

## Afterwards

1. Change the `APP_PASSWORD=` line in your local `.env` to match.
2. Redeploy, since the site only reads the new value after a deploy:

```
vercel --prod
```

Changing the password signs everyone out, including you.
