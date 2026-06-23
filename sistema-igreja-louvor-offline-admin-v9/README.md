# Grupo Louvor V.M.A — Sistema Offline/Online v9

Aplicação: **Grupo Louvor V.M.A**  
Igreja: **Vila Maria Augusta**  
Ministério: **São Miguel Paulista**  
Denominação: **Assembleia de Deus**

## Login administrativo

- Usuário: `admin`
- Senha: `Salmos51`

A senha não aparece para usuários comuns na tela de login.

## O que mudou na v9

A v9 corrige o ponto de salvamento:

1. Toda alteração feita pelo admin continua salvando imediatamente no aparelho onde foi feita.
2. Foi adicionada uma área de **Sincronização online** no painel Admin.
3. Com Firebase configurado, o admin pode enviar alterações para todos sem precisar gerar `seed-data.js` a cada alteração.
4. Usuários recebem a versão atualizada quando abrirem o app com internet.
5. Depois do primeiro carregamento atualizado, o app continua funcionando offline com a última versão salva no aparelho.

## Importante

Um app estático publicado no Netlify não possui banco de dados próprio. Por isso:

- Sem Firebase: alterações ficam apenas no aparelho do admin até você exportar `seed-data.js` e publicar no Netlify.
- Com Firebase: alterações do admin são salvas online e baixadas pelos usuários quando houver internet.

Não existe sincronização para todos enquanto todos estão 100% offline. O correto é: abre com internet, atualiza; depois usa offline.

## Como configurar o Firebase uma única vez

1. Acesse o Firebase Console.
2. Crie um projeto.
3. Crie um banco **Cloud Firestore**.
4. Crie um app Web dentro do projeto.
5. Copie o `firebaseConfig`.
6. Abra o arquivo `sync-config.js`.
7. Troque `enabled: false` por `enabled: true`.
8. Cole os dados do `firebaseConfig`.
9. Publique a pasta completa no Netlify.

Exemplo:

```js
window.APP_SYNC_CONFIG = {
  enabled: true,
  collection: 'grupo-louvor-vma',
  documentId: 'dados-principais',
  firebaseConfig: {
    apiKey: 'SUA_API_KEY',
    authDomain: 'seu-projeto.firebaseapp.com',
    projectId: 'seu-projeto',
    storageBucket: 'seu-projeto.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:xxxxxxxx'
  }
};
```

## Regras simples para teste no Firestore

Para testar rapidamente, você pode usar regra aberta temporária:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /grupo-louvor-vma/{documentId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

Use isso apenas em teste. Em produção, o ideal é proteger escrita com login real do Firebase Authentication.

## Como o admin atualiza para todos depois do Firebase configurado

1. Abra o app publicado no Netlify.
2. Entre em **Admin**.
3. Edite escala, comunicados, hinos, congregacionais ou qualquer informação.
4. Clique em **Salvar**.
5. Se estiver online, o app tentará enviar automaticamente.
6. Se quiser forçar, clique em **Enviar alterações para todos** na área de Sincronização online.

Os irmãos receberão a atualização ao abrir o app com internet. Se o celular já estiver com uma versão antiga aberta, toque em **Atualizar**.

## Atualização por seed-data.js ainda funciona

A exportação `Gerar seed-data.js` continua disponível como backup e como plano B. Use se não quiser configurar Firebase.

