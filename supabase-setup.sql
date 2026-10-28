-- Isabella Fotografia: execute no SQL Editor do projeto Supabase SEPARADO.
-- Bucket público para visitantes verem as imagens; somente usuários autenticados podem enviar/alterar/excluir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'isabella-fotografia',
  'isabella-fotografia',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "Isabella photos are publicly readable" on storage.objects;
create policy "Isabella photos are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'isabella-fotografia');

drop policy if exists "Authenticated users can upload Isabella photos" on storage.objects;
create policy "Authenticated users can upload Isabella photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'isabella-fotografia');

drop policy if exists "Authenticated users can update Isabella photos" on storage.objects;
create policy "Authenticated users can update Isabella photos"
on storage.objects for update
to authenticated
using (bucket_id = 'isabella-fotografia')
with check (bucket_id = 'isabella-fotografia');

drop policy if exists "Authenticated users can delete Isabella photos" on storage.objects;
create policy "Authenticated users can delete Isabella photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'isabella-fotografia');