/*
  Grupo Louvor V.M.A - Configuração opcional de sincronização online

  Sem esta configuração, o app salva alterações apenas no aparelho onde o admin editou.
  Para enviar alterações automaticamente para todos os usuários, crie um projeto Firebase,
  copie o firebaseConfig do app Web e preencha abaixo. Depois publique esta pasta no Netlify.
*/
window.APP_SYNC_CONFIG = {
  enabled: true,
  collection: 'grupo-louvor-vma',
  documentId: 'dados-principais',
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
