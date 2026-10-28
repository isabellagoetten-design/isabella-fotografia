# Configurar o upload global de Isabella Fotografia

Este site usa GitHub Pages, então não deve conter uma chave secreta de servidor. A integração usa apenas a chave pública (anon/publishable) e políticas que restringem upload a usuários autenticados.

## 1. Criar um projeto Supabase separado
1. Entre em https://supabase.com e crie um projeto novo só para Isabella Fotografia.
2. Guarde a senha do banco em um gerenciador seguro. Ela não vai no site.
3. Em Project Settings → API (ou Data API), copie a **Project URL** e a chave **anon/public** ou **publishable**. Nunca copie a chave `service_role`/secret para o site.

## 2. Criar o armazenamento e as políticas
1. Abra SQL Editor no projeto novo.
2. Abra o arquivo `supabase-setup.sql` deste repositório, copie todo o conteúdo e execute.
3. Isso cria o bucket `isabella-fotografia`: imagens podem ser vistas publicamente, mas upload/alteração/exclusão exigem login.

## 3. Configuração do site
1. Abra `js/supabase-config.js`.
2. Troque `COLE_AQUI_A_PROJECT_URL` pela Project URL.
3. Troque `COLE_AQUI_A_ANON_PUBLIC_KEY` pela chave pública anon/publishable.
4. Salve o arquivo. Esses dois valores são públicos por definição; a segurança depende das políticas do Storage e da autenticação, não de esconder a URL.

## 4. Criar o acesso de administradora
No Supabase, abra Authentication → Users → Add user e crie um usuário só para você. Use um e-mail seu e uma senha forte. Não compartilhe a senha no chat.

## Importante
Os arquivos de configuração e as políticas ficam preparados, mas o painel de upload ainda precisa ser conectado a esse projeto e testado depois que você preencher a URL/chave e criar o usuário. Não publique fotos importantes até validar o fluxo.