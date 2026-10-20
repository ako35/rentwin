# Private media cutover

Customer documents, vehicle records, invoice PDFs, and contract pickup/return photos must live in a dedicated R2 bucket with **public access disabled**. Keep vehicle catalog, blog, campaign, and location images in the existing public bucket.

## Cloudflare setup

1. Create a new R2 bucket (for example `rentwin-private`). Do not enable its `r2.dev` URL or connect a public custom domain.
2. Ensure the R2 API token used by the backend can read and write both the existing public bucket and the new private bucket.
3. Set `R2_PRIVATE_BUCKET=rentwin-private` in the backend environment (Vercel and local backend environment).

## Migration sequence

Run commands from the `backend` directory with the production database selected deliberately. The script is read-only by default.

1. Review the number and keys of files with `npm run private-media:migrate`.
2. Copy and verify every legacy file while leaving public copies in place:

   ```sh
   npm run private-media:migrate -- --copy-only
   ```

3. Deploy the application code and Prisma migration. New private files now use the private bucket, and authenticated API responses issue five-minute signed download URLs.
4. Remove the old public copies and clear their URL fields in the database:

   ```sh
   npm run private-media:migrate -- --apply
   ```

   This pass is resumable. It verifies that each private object exists before deleting its public copy; failed rows are reported and retained for a later retry.
5. If the public media bucket uses a Cloudflare custom domain with caching enabled, purge cached legacy document/photo URLs after the cleanup pass. The `r2.dev` development URL does not use Cloudflare cache.
6. Confirm that a new document/photo works in the admin UI, and that a legacy public object URL now returns not found while its signed private URL works only for a few minutes.

Never use the `--apply` command against a database or bucket until the dry run has been reviewed and the private bucket is ready. Keep a database backup and confirm that the R2 token can access both buckets before starting.
