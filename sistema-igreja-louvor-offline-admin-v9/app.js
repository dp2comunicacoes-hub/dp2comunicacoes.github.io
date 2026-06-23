(() => {
  'use strict';

  const APP_VERSION = '9.0.0';
  const STORAGE_KEY = 'grupoLouvorVMA_DB_v6';
  const META_KEY = 'grupoLouvorVMA_META_v6';
  const PASS_KEY = 'grupoLouvorVMA_ADMIN_PASS';
  const INSTALLED_KEY = 'grupoLouvorVMA_INSTALLED';
  const AUDIO_DB = 'grupoLouvorVMAAudioDB';
  const AUDIO_STORE = 'audios';
  const SYNC_CONFIG_KEY = 'grupoLouvorVMA_SYNC_CONFIG';
  const PENDING_SYNC_KEY = 'grupoLouvorVMA_PENDING_SYNC';
  const DEFAULT_PASSWORD = 'Salmos51';
  const LEGACY_PASSWORDS = ['louvor123'];

  const TYPES = ['harpa','congregacionais','exercicios','comunicados','membros','aniversarios','escala','cifras'];
  const TYPE_LABEL = {
    harpa:'Harpa Cristã',
    congregacionais:'Louvores congregacionais',
    exercicios:'Exercícios vocais',
    comunicados:'Comunicados',
    membros:'Membros',
    aniversarios:'Aniversariantes',
    escala:'Escala da semana',
    cifras:'Cifras'
  };
  const TYPE_KICKER = {
    harpa:'640 hinos da Harpa Cristã',
    congregacionais:'Repertório congregacional da igreja',
    exercicios:'Aquecimento, respiração e técnica vocal',
    comunicados:'Avisos importantes do grupo',
    membros:'Cadastro dos integrantes do grupo',
    aniversarios:'Aniversariantes do mês',
    escala:'Quem irá cantar, tocar e servir',
    cifras:'Acordes, tons e observações'
  };

  const defaultChurch = () => ({
    app:'Grupo Louvor V.M.A',
    nome:'Vila Maria Augusta',
    ministerio:'São Miguel Paulista',
    denominacao:'Assembleia de Deus',
    subtitulo:'Adoração • Palavra • Louvor',
    endereco:'R. Tiradentes, 272 - V. Maria Augusta'
  });

  const defaultHome = () => ({
    escalaSemana:'Equipe vocal: informe quem irá cantar nesta semana.\nInstrumentistas: informe os músicos escalados.\nMinistração: informe o responsável.',
    louvoresEnsaio:'harpa:001 | Chuvas de Graça | Tom a definir\nharpa:015 | Conversão | Tom a definir',
    proximoEnsaioTitulo:'Ensaio do Grupo de Louvor',
    proximoEnsaioData:'',
    proximoEnsaioHora:'',
    proximoEnsaioFim:'',
    proximoEnsaioLocal:'Templo - Vila Maria Augusta',
    proximoEnsaio:'Definir data e horário do próximo ensaio',
    mensagemPrincipal:'Adorar com excelência, unidade e reverência, conduzindo a igreja à presença de Deus.',
    aniversariantesSemana:'Cadastre aqui os aniversariantes da semana.',
    comunicadosImportantes:'Cadastre aqui os comunicados mais importantes para o grupo de louvor.'
  });

  const els = {};
  let db;
  let currentSection = 'harpa';
  let currentItemId = null;
  let currentTab = 'texto';
  let isAdmin = false;
  let deferredInstallPrompt = null;
  let audioObjectUrl = null;
  let cloudSync = { enabled:false, ready:false, applyingRemote:false, config:null, modules:null, docRef:null, unsubscribe:null, pushTimer:null };

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    cacheEls();
    db = loadDB();
    bindEvents();
    setupPwa();
    renderAll();
    showHome();
    initCloudSync();
  }

  function cacheEls(){
    const ids = [
      'appName','appSubtitle','goHomeBrand','updateAppBtn','installBtn','adminOpenBtn','homeView','sectionView','adminPanel',
      'denominationLine','homeTitle','churchLine','churchAddress','openSearchBtn','homeComunicadosResumo','homeEscalaResumo','homeEnsaioResumo','openRehearsalBtn','openRepertoireBtn','homeDetailPanel','homeDetailKicker','homeDetailTitle','homeDetailContent','closeHomeDetailBtn',
      'backHomeBtn','toggleListBtn','listPanel','sectionKicker','sectionTitle','sectionSearchInput','harpaMenu','itemList','listCount','sectionEmpty','downloadSectionBtn','readerPanel',
      'adminBackBtn','logoutBtn','homeForm','formAppNome','formIgrejaNome','formMinisterio','formDenominacao','formEndereco','homeFormEscala','homeFormLouvores','homeFormEnsaioTitulo','homeFormEnsaioData','homeFormEnsaioHora','homeFormEnsaioFim','homeFormEnsaioLocal','homeFormMensagem','homeFormAniversariantes','homeFormComunicados',
      'contentForm','formTitle','editId','formTipo','formNumero','formData','formTom','formTitulo','formCategoria','formTexto','formCifra','formSignificado','formAudioUrl','formAudioFile','formObs','formAtivo','formDestaque','cancelEditBtn',
      'importTipo','importFile','importText','importBtn','exportJsonBtn','exportCsvBtn','exportSeedBtn','resetBtn','newPassword','newPassword2','changePasswordBtn','adminListTipo','adminList',
      'syncStatus','syncConfigText','syncDocId','saveSyncConfigBtn','clearSyncConfigBtn','pullCloudBtn','pushCloudBtn','loginDialog','loginForm','loginUser','loginPass','closeLoginBtn','searchDialog','closeSearchBtn','globalSearchInput','globalResults','globalEmpty','toast',
      'mobileSideNav','mobileHomeBtn','mobileSearchBtn','mobileListBtn','drawerSongSearchInput','drawerSearchGoBtn','closeMobileListBtn'
    ];
    ids.forEach(id => els[id] = document.getElementById(id));
  }

  function bindEvents(){
    els.goHomeBrand.addEventListener('click', showHome);
    els.backHomeBtn.addEventListener('click', showHome);
    els.adminBackBtn.addEventListener('click', showHome);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if(page === 'home') showHome(); else openSection(page);
    }));
    document.querySelectorAll('.home-actions [data-page]').forEach(btn => btn.addEventListener('click', () => openSection(btn.dataset.page)));
    els.openSearchBtn.addEventListener('click', openSearch);
    els.closeSearchBtn.addEventListener('click', () => els.searchDialog.close());
    els.globalSearchInput.addEventListener('input', renderGlobalSearch);
    els.openRehearsalBtn.addEventListener('click', renderRehearsalDetail);
    els.openRepertoireBtn.addEventListener('click', renderRepertoireDetail);
    els.closeHomeDetailBtn.addEventListener('click', () => els.homeDetailPanel.hidden = true);
    els.sectionSearchInput.addEventListener('input', () => {
      if(els.drawerSongSearchInput && els.drawerSongSearchInput.value !== els.sectionSearchInput.value) els.drawerSongSearchInput.value = els.sectionSearchInput.value;
      renderSectionList();
    });
    els.toggleListBtn.addEventListener('click', toggleMobileList);
    els.downloadSectionBtn.addEventListener('click', downloadSectionText);
    els.updateAppBtn.addEventListener('click', forceUpdateApp);
    if(els.mobileHomeBtn) els.mobileHomeBtn.addEventListener('click', () => { closeMobileList(); showHome(); });
    if(els.mobileSearchBtn) els.mobileSearchBtn.addEventListener('click', () => { closeMobileList(); openSearch(); });
    if(els.mobileListBtn) els.mobileListBtn.addEventListener('click', openMobileMusicDrawer);
    if(els.drawerSongSearchInput) els.drawerSongSearchInput.addEventListener('input', () => {
      if(els.sectionSearchInput && els.sectionSearchInput.value !== els.drawerSongSearchInput.value) els.sectionSearchInput.value = els.drawerSongSearchInput.value;
      renderSectionList();
    });
    if(els.drawerSongSearchInput) els.drawerSongSearchInput.addEventListener('keydown', ev => {
      if(ev.key === 'Enter') { ev.preventDefault(); openFirstSectionResult(); }
    });
    if(els.drawerSearchGoBtn) els.drawerSearchGoBtn.addEventListener('click', openFirstSectionResult);
    if(els.closeMobileListBtn) els.closeMobileListBtn.addEventListener('click', closeMobileList);
    document.addEventListener('pointerdown', handleOutsideListClick);
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeMobileList(); });

    els.adminOpenBtn.addEventListener('click', () => isAdmin ? showAdmin() : openLogin());
    els.closeLoginBtn.addEventListener('click', () => els.loginDialog.close());
    els.loginForm.addEventListener('submit', handleLogin);
    els.logoutBtn.addEventListener('click', () => { isAdmin = false; showToast('Você saiu da área administrativa.'); showHome(); });

    els.homeForm.addEventListener('submit', handleHomeSave);
    els.contentForm.addEventListener('submit', handleContentSave);
    els.cancelEditBtn.addEventListener('click', clearContentForm);
    els.importBtn.addEventListener('click', handleImport);
    els.exportJsonBtn.addEventListener('click', () => downloadFile('backup-grupo-louvor-vma.json', JSON.stringify(db, null, 2), 'application/json;charset=utf-8'));
    els.exportCsvBtn.addEventListener('click', () => downloadFile('dados-grupo-louvor-vma.csv', toCsv(allItems(false)), 'text/csv;charset=utf-8'));
    els.exportSeedBtn.addEventListener('click', exportSeedData);
    els.resetBtn.addEventListener('click', resetBase);
    els.changePasswordBtn.addEventListener('click', changePassword);
    els.adminListTipo.addEventListener('change', renderAdminList);
    if(els.saveSyncConfigBtn) els.saveSyncConfigBtn.addEventListener('click', saveSyncConfigFromPanel);
    if(els.clearSyncConfigBtn) els.clearSyncConfigBtn.addEventListener('click', clearSyncConfig);
    if(els.pullCloudBtn) els.pullCloudBtn.addEventListener('click', pullCloudNow);
    if(els.pushCloudBtn) els.pushCloudBtn.addEventListener('click', pushCloudNow);
    window.addEventListener('online', () => { initCloudSync(); queueCloudPush(800); });
  }

  function clone(obj){ return JSON.parse(JSON.stringify(obj || {})); }
  function safeJson(text, fallback){ try { return JSON.parse(text); } catch { return fallback; } }

  function getSeed(){
    const seed = clone(window.SEED_DB || {});
    if(!seed.versao) seed.versao = APP_VERSION;
    if(!seed.atualizadoEm) seed.atualizadoEm = new Date().toISOString().slice(0,10);
    seed.igreja = Object.assign(defaultChurch(), seed.igreja || {});
    seed.home = Object.assign(defaultHome(), seed.home || {});
    TYPES.forEach(type => { if(!Array.isArray(seed[type])) seed[type] = []; });
    return normalizeDB(seed);
  }

  function loadDB(){
    const seed = getSeed();
    const meta = safeJson(localStorage.getItem(META_KEY), {});
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved && meta.seedVersion === seed.versao) return normalizeDB(safeJson(saved, seed));
    saveDB(seed, false);
    localStorage.setItem(META_KEY, JSON.stringify({seedVersion: seed.versao, appliedAt: new Date().toISOString()}));
    return seed;
  }

  function normalizeDB(source){
    const out = source || {};
    out.versao = out.versao || APP_VERSION;
    out.atualizadoEm = out.atualizadoEm || new Date().toISOString().slice(0,10);
    out.igreja = Object.assign(defaultChurch(), out.igreja || {});
    out.home = Object.assign(defaultHome(), out.home || {});
    TYPES.forEach(type => out[type] = Array.isArray(out[type]) ? out[type].map(item => normalizeItem(item, type)) : []);
    out._revision = Number(out._revision || 0);
    out._updatedAt = String(out._updatedAt || out.atualizadoEm || '');
    return out;
  }

  function normalizeItem(item, type){
    const n = item || {};
    return {
      id:String(n.id || `${type}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`),
      tipo:n.tipo || type,
      numero:n.numero === undefined || n.numero === null ? '' : n.numero,
      titulo:String(n.titulo || n.hino || n.nome || 'Sem título'),
      categoria:String(n.categoria || TYPE_LABEL[type] || ''),
      data:String(n.data || ''),
      texto:String(n.texto || n.letra || n.conteudo || ''),
      cifra:String(n.cifra || ''),
      significado:String(n.significado || n.mensagem || ''),
      tom:String(n.tom || ''),
      audioUrl:String(n.audioUrl || n.audio || ''),
      audioBlobKey:String(n.audioBlobKey || ''),
      audioNome:String(n.audioNome || ''),
      fonte:String(n.fonte || ''),
      ativo:n.ativo !== false,
      destaque:Boolean(n.destaque),
      observacoes:String(n.observacoes || n.obs || ''),
      palavrasChave:String(n.palavrasChave || '')
    };
  }

  function saveDB(data = db, show = true, options = {}){
    data.versao = data.versao || APP_VERSION;
    data.atualizadoEm = new Date().toISOString().slice(0,10);
    if(!options.fromRemote){
      data._revision = Date.now();
      data._updatedAt = new Date().toISOString();
      if(isAdmin) localStorage.setItem(PENDING_SYNC_KEY, '1');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(META_KEY, JSON.stringify({seedVersion: getSeed().versao, savedAt: new Date().toISOString()}));
    if(show) showToast(syncIsConfigured() ? 'Informações salvas neste aparelho e preparadas para sincronizar.' : 'Informações salvas neste aparelho.');
    if(!options.fromRemote && !options.skipCloud && isAdmin) queueCloudPush(900);
    renderSyncStatus();
  }

  function renderAll(){
    renderBrand();
    renderHomeCards();
    renderSectionList();
    fillHomeForm();
    renderAdminList();
    renderGlobalSearch();
    renderSyncPanel();
  }

  function renderBrand(){
    const c = Object.assign(defaultChurch(), db.igreja || {});
    els.appName.textContent = c.app;
    els.appSubtitle.textContent = `${c.denominacao} • ${c.ministerio} • ${c.nome}`;
    els.denominationLine.textContent = `${c.denominacao} • ${c.ministerio}`;
    els.homeTitle.textContent = c.app;
    els.churchLine.textContent = c.nome;
    els.churchAddress.textContent = c.endereco || '';
    document.title = c.app;
  }

  function renderHomeCards(){
    const h = Object.assign(defaultHome(), db.home || {});
    els.homeComunicadosResumo.textContent = firstLine(h.comunicadosImportantes, 'Ver avisos do grupo');
    els.homeEscalaResumo.textContent = firstLine(h.escalaSemana, 'Quem irá cantar e tocar');
    els.homeEnsaioResumo.textContent = rehearsalSummary(h);
  }

  function rehearsalSummary(h){
    if(h.proximoEnsaioData){
      const parts = [formatDate(h.proximoEnsaioData)];
      if(h.proximoEnsaioHora) parts.push(h.proximoEnsaioHora);
      return parts.join(' às ');
    }
    return h.proximoEnsaio || 'Data e horário do ensaio';
  }


  function isSongSection(type = currentSection){
    return type === 'harpa' || type === 'congregacionais' || type === 'cifras';
  }

  function openMobileMusicDrawer(){
    if(!els.sectionView.classList.contains('active-view')){
      openSection('harpa');
      setTimeout(() => {
        if(!document.body.classList.contains('list-open')) toggleMobileList();
      }, 80);
      return;
    }
    toggleMobileList();
  }

  function toggleMobileList(){
    if(!els.listPanel) return;
    els.harpaMenu.open = true;
    const willOpen = !document.body.classList.contains('list-open');
    document.body.classList.toggle('list-open', willOpen);
    if(willOpen && els.drawerSongSearchInput){
      if(els.sectionSearchInput) els.drawerSongSearchInput.value = els.sectionSearchInput.value || '';
      setTimeout(() => els.drawerSongSearchInput.focus(), 120);
    }
  }

  function closeMobileList(){
    document.body.classList.remove('list-open');
  }

  function handleOutsideListClick(ev){
    if(!document.body.classList.contains('list-open')) return;
    const target = ev.target;
    const allowed = [els.listPanel, els.mobileListBtn, els.toggleListBtn].filter(Boolean);
    if(allowed.some(el => el.contains(target))) return;
    closeMobileList();
  }

  function showHome(){
    setActiveView('home');
    setActiveTab('home');
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function showAdmin(){
    if(!isAdmin){ openLogin(); return; }
    setActiveView('admin');
    setActiveTab('admin');
    fillHomeForm();
    renderAdminList();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function setActiveView(view){
    els.homeView.classList.toggle('active-view', view === 'home');
    els.sectionView.classList.toggle('active-view', view === 'section');
    els.adminPanel.classList.toggle('active-view', view === 'admin');
  }

  function setActiveTab(page){
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
  }

  function openSection(type, itemId = null){
    if(!TYPES.includes(type)) type = 'harpa';
    currentSection = type;
    currentItemId = itemId || null;
    currentTab = 'texto';
    setActiveView('section');
    setActiveTab(type);
    els.sectionKicker.textContent = TYPE_KICKER[type] || 'Seção';
    els.sectionTitle.textContent = TYPE_LABEL[type] || 'Conteúdos';
    els.sectionSearchInput.value = '';
    els.harpaMenu.open = !itemId;
    closeMobileList();
    renderSectionList();
    if(itemId) renderReader(findItem(type, itemId)); else renderPlaceholder();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function getSectionFilteredItems(){
    const q = els.sectionSearchInput ? (els.sectionSearchInput.value || '') : '';
    return (db[currentSection] || [])
      .filter(item => (item.ativo || isAdmin) && matchesQuery({type:currentSection, item}, q))
      .sort(sortItems);
  }

  function renderSectionList(){
    if(!db) return;
    const list = getSectionFilteredItems();
    if(els.drawerSongSearchInput && els.sectionSearchInput && els.drawerSongSearchInput.value !== els.sectionSearchInput.value) els.drawerSongSearchInput.value = els.sectionSearchInput.value;
    els.listCount.textContent = `${list.length} ${list.length === 1 ? 'item' : 'itens'}`;
    els.itemList.innerHTML = list.map(item => itemListButton(item)).join('');
    els.sectionEmpty.hidden = list.length > 0;
    els.itemList.querySelectorAll('.item-btn').forEach(btn => btn.addEventListener('click', () => {
      const item = findItem(currentSection, btn.dataset.id);
      currentItemId = item?.id || null;
      currentTab = 'texto';
      els.harpaMenu.open = false;
      closeMobileList();
      renderSectionList();
      renderReader(item);
      if(window.matchMedia('(max-width: 980px)').matches) els.readerPanel.scrollIntoView({behavior:'smooth', block:'start'});
    }));
  }

  function openFirstSectionResult(){
    const list = getSectionFilteredItems();
    if(!list.length){
      showToast('Nenhum hino ou louvor encontrado.');
      return;
    }
    const item = list[0];
    currentItemId = item.id;
    currentTab = 'texto';
    els.harpaMenu.open = false;
    closeMobileList();
    renderSectionList();
    renderReader(item);
    els.readerPanel.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function itemListButton(item){
    const num = item.numero !== '' ? String(item.numero).padStart(3,'0') + ' • ' : '';
    const active = item.id === currentItemId ? ' active' : '';
    const info = [item.tom ? `Tom ${item.tom}` : '', item.data ? formatDate(item.data) : '', item.categoria || ''].filter(Boolean).join(' • ');
    return `<button class="item-btn${active}" data-id="${escapeAttr(item.id)}" type="button"><strong>${escapeHtml(num + item.titulo)}</strong><small>${escapeHtml(info || TYPE_LABEL[currentSection])}</small></button>`;
  }

  function renderPlaceholder(){
    els.readerPanel.innerHTML = `<div class="reader-placeholder"><span class="placeholder-icon">♫</span><h2>Escolha um item</h2><p>Selecione um conteúdo na lista vertical para abrir os detalhes.</p></div>`;
  }

  function renderReader(item){
    if(!item){ renderPlaceholder(); return; }
    if(!isSongSection(currentSection)){
      renderSimpleReader(item);
      return;
    }
    const tabs = [
      ['texto','Letra'],
      ['cifra','Cifra'],
      ['tom','Tom'],
      ['significado','Significado'],
      ['melodia','Melodia'],
      ['obs','Observações']
    ];
    const num = item.numero !== '' ? String(item.numero).padStart(3,'0') : '';
    els.readerPanel.innerHTML = `
      <div class="reader-header">
        <div class="reader-title-row">
          <div>
            <span class="eyebrow">${escapeHtml(TYPE_LABEL[currentSection])}</span>
            <h2>${escapeHtml(num ? num + ' - ' + item.titulo : item.titulo)}</h2>
            <div class="meta-line">
              <span class="meta blue">Categoria: ${escapeHtml(item.categoria || TYPE_LABEL[currentSection])}</span>
              <span class="meta green">Tom: ${escapeHtml(item.tom || 'Não informado')}</span>
              ${item.data ? `<span class="meta gold">Data: ${escapeHtml(formatDate(item.data))}</span>` : ''}
            </div>
          </div>
          ${item.audioUrl || item.audioBlobKey ? `<button class="btn gold" data-tab-shortcut="melodia" type="button">Ouvir melodia</button>` : ''}
        </div>
      </div>
      <div class="reader-tabs song-tabs">${tabs.map(([key,label]) => `<button class="reader-tab${currentTab===key?' active':''}" data-tab="${key}" type="button">${label}</button>`).join('')}</div>
      <div id="readerTabContent" class="tab-content">${renderTabContent(item, currentTab)}</div>
    `;
    els.readerPanel.querySelectorAll('.reader-tab,[data-tab-shortcut]').forEach(btn => btn.addEventListener('click', async () => {
      currentTab = btn.dataset.tab || btn.dataset.tabShortcut || 'texto';
      els.readerPanel.querySelectorAll('.reader-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
      const content = els.readerPanel.querySelector('#readerTabContent');
      content.innerHTML = renderTabContent(item, currentTab);
      if(currentTab === 'melodia') await hydrateAudio(item, content);
    }));
    if(currentTab === 'melodia') hydrateAudio(item, els.readerPanel.querySelector('#readerTabContent'));
  }

  function renderSimpleReader(item){
    const num = item.numero !== '' ? String(item.numero).padStart(3,'0') : '';
    const title = num ? num + ' - ' + item.titulo : item.titulo;
    els.readerPanel.innerHTML = `
      <div class="reader-header simple-header">
        <div class="reader-title-row">
          <div>
            <span class="eyebrow">${escapeHtml(TYPE_LABEL[currentSection] || item.categoria || 'Conteúdo')}</span>
            <h2>${escapeHtml(title)}</h2>
            <div class="meta-line">
              <span class="meta blue">${escapeHtml(item.categoria || TYPE_LABEL[currentSection] || 'Informação')}</span>
              ${item.tom ? `<span class="meta green">Tom: ${escapeHtml(item.tom)}</span>` : ''}
              ${item.data ? `<span class="meta gold">Data: ${escapeHtml(formatDate(item.data))}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="simple-content">
        ${item.texto ? `<section class="simple-block"><h3>${escapeHtml(currentSection === 'comunicados' ? 'Comunicado' : currentSection === 'membros' ? 'Dados' : 'Conteúdo')}</h3><pre>${escapeHtml(item.texto)}</pre></section>` : ''}
        ${item.significado ? `<section class="simple-block"><h3>Resumo</h3><pre>${escapeHtml(item.significado)}</pre></section>` : ''}
        ${item.observacoes ? `<section class="simple-block"><h3>Observações</h3><pre>${escapeHtml(item.observacoes)}</pre></section>` : ''}
        ${(item.audioUrl || item.audioBlobKey) ? `<section class="simple-block"><h3>Áudio</h3>${renderTabContent(item, 'melodia')}</section>` : ''}
        ${(!item.texto && !item.significado && !item.observacoes && !item.audioUrl && !item.audioBlobKey) ? '<p class="empty">Nenhuma informação cadastrada para este item.</p>' : ''}
      </div>
    `;
    const audioBox = els.readerPanel.querySelector('#audioBox');
    if(audioBox) hydrateAudio(item, audioBox.closest('.simple-block') || els.readerPanel);
  }

  function renderTabContent(item, tab){
    if(tab === 'cifra') return item.cifra ? `<pre>${escapeHtml(item.cifra)}</pre>` : emptyTab('Nenhuma cifra cadastrada para este item.');
    if(tab === 'tom') return `<div class="big-tone">${escapeHtml(item.tom || '—')}</div><p>${item.tom ? 'Tom cadastrado para este hino/louvor.' : 'Nenhum tom cadastrado ainda.'}</p>`;
    if(tab === 'significado') return item.significado ? `<pre>${escapeHtml(item.significado)}</pre>` : emptyTab('Nenhum significado cadastrado ainda. O administrador pode inserir a mensagem central deste louvor no painel Admin.');
    if(tab === 'melodia') return `<div class="audio-box" id="audioBox"><strong>Melodia / áudio</strong>${item.audioUrl ? `<audio controls preload="none" src="${escapeAttr(item.audioUrl)}"></audio><a class="btn soft" href="${escapeAttr(item.audioUrl)}" target="_blank" rel="noopener">Abrir áudio</a>` : ''}${item.audioBlobKey ? '<p>Carregando áudio salvo neste aparelho...</p>' : ''}${!item.audioUrl && !item.audioBlobKey ? '<p>Nenhuma melodia ou áudio cadastrado ainda.</p>' : ''}</div>`;
    if(tab === 'obs') return item.observacoes ? `<pre>${escapeHtml(item.observacoes)}</pre>` : emptyTab('Sem observações cadastradas.');
    return item.texto ? `<pre>${escapeHtml(item.texto)}</pre>` : emptyTab('Nenhum conteúdo cadastrado.');
  }

  function emptyTab(text){ return `<p class="empty">${escapeHtml(text)}</p>`; }

  async function hydrateAudio(item, contentEl){
    if(!item.audioBlobKey) return;
    try{
      const blob = await getAudioBlob(item.audioBlobKey);
      const box = contentEl.querySelector('#audioBox');
      if(!box || !blob) return;
      if(audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
      audioObjectUrl = URL.createObjectURL(blob);
      box.innerHTML = `<strong>${escapeHtml(item.audioNome || 'Áudio salvo')}</strong><audio controls src="${audioObjectUrl}"></audio>` + (item.audioUrl ? `<a class="btn soft" href="${escapeAttr(item.audioUrl)}" target="_blank" rel="noopener">Abrir áudio externo</a>` : '');
    }catch(err){ console.warn(err); }
  }

  function renderRehearsalDetail(){
    const h = Object.assign(defaultHome(), db.home || {});
    const when = rehearsalSummary(h);
    els.homeDetailKicker.textContent = 'Próximo ensaio';
    els.homeDetailTitle.textContent = h.proximoEnsaioTitulo || 'Ensaio do Grupo de Louvor';
    els.homeDetailContent.innerHTML = `
      <p><strong>Data e horário:</strong> ${escapeHtml(when)}</p>
      <p><strong>Local:</strong> ${escapeHtml(h.proximoEnsaioLocal || 'Não informado')}</p>
      <p><strong>Mensagem principal:</strong><br>${nl2br(h.mensagemPrincipal || '')}</p>
      <div class="form-actions wrap">
        <button id="addCalendarBtn" class="btn gold" type="button">Adicionar à agenda do celular</button>
        <button class="btn soft" data-page="escala" type="button">Ver escala completa</button>
      </div>
      <p class="empty">O botão de agenda gera um arquivo .ics. No celular, toque nele para adicionar ao calendário.</p>`;
    els.homeDetailPanel.hidden = false;
    document.getElementById('addCalendarBtn').addEventListener('click', downloadIcs);
    els.homeDetailContent.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => openSection(btn.dataset.page)));
    els.homeDetailPanel.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function renderRepertoireDetail(){
    const lines = parseRepertoireLines(db.home?.louvoresEnsaio || '');
    els.homeDetailKicker.textContent = 'Louvores do ensaio';
    els.homeDetailTitle.textContent = 'Hinos e louvores escolhidos';
    if(!lines.length){
      els.homeDetailContent.innerHTML = '<p class="empty">Nenhum louvor de ensaio cadastrado.</p>';
    }else{
      els.homeDetailContent.innerHTML = `<div class="repertoire-list">${lines.map((line, idx) => renderRepertoireLine(line, idx)).join('')}</div>`;
      els.homeDetailContent.querySelectorAll('.repertoire-btn').forEach(btn => btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        if(type && id) openSection(type, id); else showToast('Esse louvor ainda não está vinculado a um cadastro.');
      }));
    }
    els.homeDetailPanel.hidden = false;
    els.homeDetailPanel.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function renderRepertoireLine(line, idx){
    const found = findRepertoireItem(line);
    const type = found?.type || '';
    const item = found?.item || null;
    const num = item?.numero !== undefined && item?.numero !== '' ? String(item.numero).padStart(3,'0') : (line.numero ? String(line.numero).padStart(3,'0') : String(idx+1).padStart(2,'0'));
    const title = item?.titulo || line.titulo || line.raw;
    const tone = line.tom || item?.tom || 'Tom a definir';
    const label = type ? TYPE_LABEL[type] : (line.tipo || 'Cadastro manual');
    return `<button class="repertoire-btn" type="button" data-type="${escapeAttr(type)}" data-id="${escapeAttr(item?.id || '')}"><span class="number-pill">${escapeHtml(num)}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(label)}</small></span><span class="tone-pill">${escapeHtml(tone)}</span></button>`;
  }

  function parseRepertoireLines(text){
    return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(raw => {
      let tipo = '', numero = '', titulo = '', tom = '';
      const parts = raw.split('|').map(s => s.trim());
      const first = parts[0] || raw;
      titulo = parts[1] || '';
      tom = parts[2] || '';
      const m = first.match(/^(harpa|hino|hc|congregacional|congregacionais|louvor|cifra)\s*[:#-]?\s*(\d+)?/i);
      if(m){
        const t = normalize(m[1]);
        tipo = ['harpa','hino','hc'].includes(t) ? 'harpa' : (t.startsWith('congreg') || t === 'louvor' ? 'congregacionais' : 'cifras');
        numero = m[2] || '';
      }else{
        const n = first.match(/\d+/);
        numero = n ? n[0] : '';
        titulo = titulo || first.replace(/^\d+\s*[-–.]?\s*/, '').trim();
      }
      if(!titulo && parts.length > 1) titulo = parts[1];
      return {raw, tipo, numero, titulo, tom};
    });
  }

  function findRepertoireItem(line){
    const types = line.tipo ? [line.tipo] : ['harpa','congregacionais','cifras'];
    for(const type of types){
      const list = db[type] || [];
      if(line.numero){
        const byNum = list.find(item => Number(item.numero) === Number(line.numero));
        if(byNum) return {type, item:byNum};
      }
      if(line.titulo){
        const q = normalize(line.titulo);
        const byTitle = list.find(item => normalize(item.titulo).includes(q) || q.includes(normalize(item.titulo)));
        if(byTitle) return {type, item:byTitle};
      }
    }
    return null;
  }

  function openSearch(){
    els.searchDialog.showModal();
    renderGlobalSearch();
    setTimeout(() => els.globalSearchInput.focus(), 80);
  }

  function renderGlobalSearch(){
    if(!els.globalSearchInput) return;
    const q = els.globalSearchInput.value || '';
    if(!q.trim()){
      els.globalResults.innerHTML = '<p class="empty">Digite algo para buscar em todo o sistema.</p>';
      els.globalEmpty.hidden = true;
      return;
    }
    const results = allItems(true).filter(entry => matchesQuery(entry, q)).slice(0, 80);
    els.globalResults.innerHTML = results.map(({type,item}) => `
      <button class="result-card" type="button" data-type="${escapeAttr(type)}" data-id="${escapeAttr(item.id)}">
        <strong>${escapeHtml(item.numero !== '' ? String(item.numero).padStart(3,'0') + ' - ' + item.titulo : item.titulo)}</strong>
        <small>${escapeHtml(TYPE_LABEL[type])}${item.tom ? ' • Tom ' + escapeHtml(item.tom) : ''}${item.data ? ' • ' + escapeHtml(formatDate(item.data)) : ''}</small>
        <p>${escapeHtml(snippet({type,item}, 150))}</p>
      </button>`).join('');
    els.globalEmpty.hidden = results.length > 0;
    els.globalResults.querySelectorAll('.result-card').forEach(card => card.addEventListener('click', () => {
      els.searchDialog.close();
      openSection(card.dataset.type, card.dataset.id);
    }));
  }

  function fillHomeForm(){
    const c = Object.assign(defaultChurch(), db.igreja || {});
    const h = Object.assign(defaultHome(), db.home || {});
    els.formAppNome.value = c.app || '';
    els.formIgrejaNome.value = c.nome || '';
    els.formMinisterio.value = c.ministerio || '';
    els.formDenominacao.value = c.denominacao || '';
    els.formEndereco.value = c.endereco || '';
    els.homeFormEscala.value = h.escalaSemana || '';
    els.homeFormLouvores.value = h.louvoresEnsaio || '';
    els.homeFormEnsaioTitulo.value = h.proximoEnsaioTitulo || '';
    els.homeFormEnsaioData.value = h.proximoEnsaioData || '';
    els.homeFormEnsaioHora.value = h.proximoEnsaioHora || '';
    els.homeFormEnsaioFim.value = h.proximoEnsaioFim || '';
    els.homeFormEnsaioLocal.value = h.proximoEnsaioLocal || '';
    els.homeFormMensagem.value = h.mensagemPrincipal || '';
    els.homeFormAniversariantes.value = h.aniversariantesSemana || '';
    els.homeFormComunicados.value = h.comunicadosImportantes || '';
  }

  function handleHomeSave(ev){
    ev.preventDefault();
    db.igreja = {
      app: els.formAppNome.value.trim() || 'Grupo Louvor V.M.A',
      nome: els.formIgrejaNome.value.trim() || 'Vila Maria Augusta',
      ministerio: els.formMinisterio.value.trim() || 'São Miguel Paulista',
      denominacao: els.formDenominacao.value.trim() || 'Assembleia de Deus',
      subtitulo: 'Adoração • Palavra • Louvor',
      endereco: els.formEndereco.value.trim()
    };
    db.home = Object.assign(defaultHome(), db.home || {}, {
      escalaSemana: els.homeFormEscala.value.trim(),
      louvoresEnsaio: els.homeFormLouvores.value.trim(),
      proximoEnsaioTitulo: els.homeFormEnsaioTitulo.value.trim(),
      proximoEnsaioData: els.homeFormEnsaioData.value,
      proximoEnsaioHora: els.homeFormEnsaioHora.value,
      proximoEnsaioFim: els.homeFormEnsaioFim.value,
      proximoEnsaioLocal: els.homeFormEnsaioLocal.value.trim(),
      proximoEnsaio: rehearsalSummary({proximoEnsaioData:els.homeFormEnsaioData.value, proximoEnsaioHora:els.homeFormEnsaioHora.value, proximoEnsaio: ''}),
      mensagemPrincipal: els.homeFormMensagem.value.trim(),
      aniversariantesSemana: els.homeFormAniversariantes.value.trim(),
      comunicadosImportantes: els.homeFormComunicados.value.trim()
    });
    saveDB();
    renderAll();
  }

  async function handleContentSave(ev){
    ev.preventDefault();
    const type = els.formTipo.value;
    const id = els.editId.value || `${type}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const old = findItem(type, id) || {};
    const item = normalizeItem({
      id,
      tipo:type,
      numero: els.formNumero.value === '' ? '' : Number(els.formNumero.value),
      titulo: els.formTitulo.value.trim(),
      categoria: els.formCategoria.value.trim(),
      data: els.formData.value,
      texto: els.formTexto.value,
      cifra: els.formCifra.value,
      significado: els.formSignificado.value,
      tom: els.formTom.value.trim(),
      audioUrl: els.formAudioUrl.value.trim(),
      audioBlobKey: old.audioBlobKey || '',
      audioNome: old.audioNome || '',
      observacoes: els.formObs.value,
      ativo: els.formAtivo.checked,
      destaque: els.formDestaque.checked,
      fonte: old.fonte || 'Cadastro administrativo'
    }, type);
    const file = els.formAudioFile.files && els.formAudioFile.files[0];
    if(file){
      item.audioBlobKey = `audio-${item.id}`;
      item.audioNome = file.name;
      await putAudioBlob(item.audioBlobKey, file);
    }
    if(!Array.isArray(db[type])) db[type] = [];
    const idx = db[type].findIndex(x => x.id === id);
    if(idx >= 0) db[type][idx] = item; else db[type].push(item);
    saveDB();
    clearContentForm();
    renderAll();
    showToast(syncIsConfigured() ? 'Cadastro salvo. Se houver internet, será enviado para todos automaticamente.' : 'Cadastro salvo neste aparelho. Para todos receberem automaticamente, configure a sincronização online.');
  }

  function clearContentForm(){
    els.contentForm.reset();
    els.editId.value = '';
    els.formTitle.textContent = 'Novo cadastro';
    els.formAtivo.checked = true;
    els.formDestaque.checked = false;
  }

  function editItem(type, id){
    const item = findItem(type, id);
    if(!item) return;
    els.formTitle.textContent = 'Editar cadastro';
    els.editId.value = item.id;
    els.formTipo.value = type;
    els.formNumero.value = item.numero;
    els.formData.value = item.data;
    els.formTom.value = item.tom;
    els.formTitulo.value = item.titulo;
    els.formCategoria.value = item.categoria;
    els.formTexto.value = item.texto;
    els.formCifra.value = item.cifra;
    els.formSignificado.value = item.significado;
    els.formAudioUrl.value = item.audioUrl;
    els.formObs.value = item.observacoes;
    els.formAtivo.checked = item.ativo;
    els.formDestaque.checked = item.destaque;
    els.contentForm.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function deleteItem(type, id){
    const item = findItem(type, id);
    if(!item) return;
    if(!confirm(`Excluir "${item.titulo}"?`)) return;
    db[type] = (db[type] || []).filter(x => x.id !== id);
    saveDB();
    if(currentItemId === id){ currentItemId = null; renderPlaceholder(); }
    renderAll();
  }

  function renderAdminList(){
    if(!els.adminListTipo) return;
    const type = els.adminListTipo.value || 'harpa';
    const list = (db[type] || []).slice().sort(sortItems);
    els.adminList.innerHTML = list.map(item => `
      <div class="admin-row">
        <div><strong>${escapeHtml(item.numero !== '' ? String(item.numero).padStart(3,'0') + ' - ' + item.titulo : item.titulo)}</strong><small>${escapeHtml(item.categoria || TYPE_LABEL[type])}${item.tom ? ' • Tom ' + escapeHtml(item.tom) : ''}${item.ativo ? '' : ' • Inativo'}</small></div>
        <div class="row-actions"><button class="btn tiny soft" data-edit="${escapeAttr(item.id)}" type="button">Editar</button><button class="btn tiny danger" data-del="${escapeAttr(item.id)}" type="button">Excluir</button></div>
      </div>`).join('') || '<p class="empty">Nenhum cadastro nesta seção.</p>';
    els.adminList.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editItem(type, btn.dataset.edit)));
    els.adminList.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => deleteItem(type, btn.dataset.del)));
  }

  async function handleImport(){
    const type = els.importTipo.value;
    let text = els.importText.value.trim();
    const file = els.importFile.files && els.importFile.files[0];
    if(file) text = await file.text();
    if(!text){ showToast('Selecione um arquivo ou cole um texto.'); return; }
    let rows = [];
    try{
      if(file && file.name.toLowerCase().endsWith('.csv')) rows = parseCsv(text, type);
      else if(text.trim().startsWith('{') || text.trim().startsWith('[')) rows = parseJsonImport(text, type);
      else rows = parseTextBlocks(text, type === 'auto' ? 'harpa' : type);
    }catch(err){ console.error(err); showToast('Não consegui importar. Verifique o arquivo.'); return; }
    let count = 0;
    rows.forEach(({type:t,item}) => {
      if(!TYPES.includes(t)) t = type === 'auto' ? 'harpa' : type;
      if(!Array.isArray(db[t])) db[t] = [];
      db[t].push(normalizeItem(item, t)); count++;
    });
    saveDB(); renderAll();
    els.importText.value = ''; els.importFile.value = '';
    showToast(`${count} registros importados.`);
  }

  function parseJsonImport(text, target){
    const data = JSON.parse(text);
    const rows = [];
    if(Array.isArray(data)){
      data.forEach((item, idx) => rows.push({type: target === 'auto' ? (item.tipo || 'harpa') : target, item:Object.assign({id:`json-${Date.now()}-${idx}`}, item)}));
    }else if(data.harpa || data.congregacionais || data.exercicios || data.comunicados || data.membros || data.aniversarios || data.escala || data.cifras){
      TYPES.forEach(t => (data[t] || []).forEach((item, idx) => rows.push({type:t, item:Object.assign({id:item.id || `json-${t}-${Date.now()}-${idx}`}, item)})));
    }else{
      Object.keys(data).forEach((key, idx) => {
        const it = data[key];
        const number = Number(String(key).replace(/\D/g,'')) || it.numero || idx+1;
        rows.push({type: target === 'auto' ? 'harpa' : target, item:{id:`json-harpa-${number}-${Date.now()}`, numero:number, titulo:it.hino || it.titulo || `Hino ${number}`, texto:[it.coro, ...(Object.values(it.verses || {}))].filter(Boolean).join('\n\n'), categoria:'Harpa Cristã', significado:it.significado || ''}});
      });
    }
    return rows;
  }

  function parseCsv(text, target){
    const lines = text.split(/\r?\n/).filter(Boolean);
    if(lines.length < 2) return [];
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = splitCsv(lines.shift(), sep).map(h => normalize(h));
    return lines.map((line, idx) => {
      const cols = splitCsv(line, sep);
      const obj = {};
      headers.forEach((h,i) => obj[h] = cols[i] || '');
      const t = target === 'auto' ? (obj.tipo || 'harpa') : target;
      return {type:t, item:{id:`csv-${t}-${Date.now()}-${idx}`, tipo:t, numero: obj.numero || obj.n || '', titulo: obj.titulo || obj.nome || `Importado ${idx+1}`, categoria: obj.categoria || '', data: obj.data || '', texto: obj.texto || obj.letra || obj.conteudo || '', cifra: obj.cifra || '', significado: obj.significado || obj.mensagem || '', tom: obj.tom || '', audioUrl: obj.audiourl || obj.audio || '', observacoes: obj.observacoes || obj.obs || '', ativo: obj.ativo !== 'false'}};
    });
  }

  function splitCsv(line, sep){
    const out=[]; let cur=''; let quote=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch === '"' && line[i+1] === '"'){ cur+='"'; i++; continue; }
      if(ch === '"'){ quote=!quote; continue; }
      if(ch === sep && !quote){ out.push(cur); cur=''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  }

  function parseTextBlocks(text, type){
    const parts = text.split(/\n(?=###\s*)/g).map(p => p.trim()).filter(Boolean);
    return parts.map((part, idx) => {
      const lines = part.split(/\r?\n/);
      const header = lines.shift().replace(/^###\s*/, '').trim();
      const m = header.match(/^(\d+)\s*[-–.]\s*(.+)$/);
      const numero = m ? Number(m[1]) : '';
      const titulo = m ? m[2] : header || `Importado ${idx+1}`;
      let body = lines.join('\n').trim();
      let significado = '';
      const sigMatch = body.match(/\n?Significado\s*:\s*([\s\S]*)$/i);
      if(sigMatch){ significado = sigMatch[1].trim(); body = body.slice(0, sigMatch.index).trim(); }
      return {type, item:{id:`txt-${type}-${Date.now()}-${idx}`, numero, titulo, texto:body, significado, categoria:TYPE_LABEL[type] || type, ativo:true}};
    });
  }

  function toCsv(rows){
    const headers = ['tipo','numero','titulo','categoria','data','tom','texto','significado','cifra','audioUrl','ativo','destaque','observacoes'];
    return [headers.join(';')].concat(rows.map(({type,item}) => headers.map(h => csvCell(h==='tipo'?type:item[h])).join(';'))).join('\n');
  }
  function csvCell(v){ return `"${String(v ?? '').replace(/"/g,'""')}"`; }

  function exportSeedData(){
    const exported = clone(db);
    exported.versao = `9.0.0-${new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,12)}`;
    exported.atualizadoEm = new Date().toISOString().slice(0,10);
    const content = 'window.SEED_DB = ' + JSON.stringify(exported, null, 2) + ';\n';
    downloadFile('seed-data.js', content, 'text/javascript;charset=utf-8');
    showToast('seed-data.js gerado. Substitua este arquivo na pasta e faça novo deploy no Netlify.');
  }

  function resetBase(){
    if(!confirm('Restaurar a base original? Alterações locais serão apagadas deste aparelho.')) return;
    db = getSeed(); saveDB(db); renderAll(); showToast('Base original restaurada.');
  }

  function changePassword(){
    const a = els.newPassword.value.trim();
    const b = els.newPassword2.value.trim();
    if(!a || a.length < 4){ showToast('Digite uma senha com pelo menos 4 caracteres.'); return; }
    if(a !== b){ showToast('As senhas não conferem.'); return; }
    localStorage.setItem(PASS_KEY, a);
    els.newPassword.value = ''; els.newPassword2.value = '';
    showToast('Senha alterada neste aparelho.');
  }

  function getFileSyncConfig(){
    const cfg = window.APP_SYNC_CONFIG || {};
    return cfg && typeof cfg === 'object' ? cfg : {};
  }

  function getLocalSyncConfig(){
    return safeJson(localStorage.getItem(SYNC_CONFIG_KEY), {});
  }

  function getSyncConfig(){
    const fileCfg = getFileSyncConfig();
    const localCfg = getLocalSyncConfig();
    const merged = Object.assign({}, fileCfg, localCfg);
    merged.firebaseConfig = Object.assign({}, fileCfg.firebaseConfig || {}, localCfg.firebaseConfig || {});
    if(!merged.collection) merged.collection = 'grupo-louvor-vma';
    if(!merged.documentId) merged.documentId = 'dados-principais';
    return merged;
  }

  function syncIsConfigured(){
    const cfg = getSyncConfig();
    return Boolean(cfg.enabled && cfg.firebaseConfig && cfg.firebaseConfig.apiKey && cfg.firebaseConfig.projectId);
  }

  function renderSyncPanel(){
    if(!els.syncConfigText) return;
    const cfg = getSyncConfig();
    els.syncConfigText.value = cfg.firebaseConfig && Object.keys(cfg.firebaseConfig).length ? JSON.stringify(cfg.firebaseConfig, null, 2) : '';
    els.syncDocId.value = cfg.documentId || 'dados-principais';
    renderSyncStatus();
  }

  function renderSyncStatus(msg){
    if(!els.syncStatus) return;
    let text = msg || '';
    if(!text){
      if(!syncIsConfigured()) text = 'Sincronização online desativada. As alterações ficam apenas neste aparelho até você configurar Firebase ou publicar seed-data.js.';
      else if(cloudSync.ready) text = localStorage.getItem(PENDING_SYNC_KEY) === '1' ? 'Conectado ao Firebase. Existe alteração local aguardando envio.' : 'Conectado ao Firebase. Alterações do admin sincronizam para todos quando houver internet.';
      else text = navigator.onLine ? 'Firebase configurado, conectando...' : 'Firebase configurado. Sem internet agora; será sincronizado quando voltar.';
    }
    els.syncStatus.textContent = text;
  }

  function saveSyncConfigFromPanel(){
    if(!els.syncConfigText) return;
    const raw = els.syncConfigText.value.trim();
    if(!raw){ showToast('Cole o firebaseConfig antes de salvar.'); return; }
    let firebaseConfig;
    try{ firebaseConfig = JSON.parse(raw); }catch(err){ showToast('firebaseConfig inválido. Cole um JSON válido.'); return; }
    if(!firebaseConfig.apiKey || !firebaseConfig.projectId){ showToast('O firebaseConfig precisa ter apiKey e projectId.'); return; }
    const config = {
      enabled:true,
      firebaseConfig,
      collection:'grupo-louvor-vma',
      documentId:(els.syncDocId.value || 'dados-principais').trim() || 'dados-principais'
    };
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    cloudSync.ready = false;
    showToast('Sincronização configurada neste aparelho. Para todos usarem, coloque a mesma configuração no sync-config.js e suba uma vez no Netlify.');
    initCloudSync(true);
  }

  function clearSyncConfig(){
    if(!confirm('Desativar a configuração de sincronização deste aparelho?')) return;
    localStorage.removeItem(SYNC_CONFIG_KEY);
    localStorage.removeItem(PENDING_SYNC_KEY);
    if(cloudSync.unsubscribe) { try{ cloudSync.unsubscribe(); }catch{} }
    cloudSync = { enabled:false, ready:false, applyingRemote:false, config:null, modules:null, docRef:null, unsubscribe:null, pushTimer:null };
    renderSyncPanel();
    showToast('Sincronização local removida.');
  }

  async function initCloudSync(force = false){
    if(!syncIsConfigured()){ renderSyncStatus(); return; }
    if(cloudSync.ready && !force) { renderSyncStatus(); return; }
    const cfg = getSyncConfig();
    cloudSync.config = cfg;
    cloudSync.enabled = true;
    renderSyncStatus('Conectando ao Firebase...');
    try{
      const appMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
      const fsMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
      const name = 'grupoLouvorVMA_' + normalize(cfg.firebaseConfig.projectId || 'app').replace(/[^a-z0-9]/g,'_');
      const app = appMod.getApps().find(a => a.name === name) || appMod.initializeApp(cfg.firebaseConfig, name);
      const fs = fsMod.getFirestore(app);
      const ref = fsMod.doc(fs, cfg.collection || 'grupo-louvor-vma', cfg.documentId || 'dados-principais');
      cloudSync.modules = fsMod;
      cloudSync.docRef = ref;
      cloudSync.ready = true;
      await pullCloudNow(false);
      if(cloudSync.unsubscribe) { try{ cloudSync.unsubscribe(); }catch{} }
      cloudSync.unsubscribe = fsMod.onSnapshot(ref, snap => {
        if(!snap.exists()) return;
        applyRemoteSnapshot(snap.data());
      }, err => {
        console.warn('Erro no listener Firebase:', err);
        renderSyncStatus('Não consegui acompanhar mudanças online. Confira permissões do Firestore.');
      });
      if(localStorage.getItem(PENDING_SYNC_KEY) === '1' && isAdmin) queueCloudPush(1200);
      renderSyncStatus();
    }catch(err){
      console.warn('Falha ao iniciar Firebase:', err);
      cloudSync.ready = false;
      renderSyncStatus('Não conectou ao Firebase. O app continua salvando localmente. Verifique internet, configuração e regras do Firestore.');
    }
  }

  async function pullCloudNow(show = true){
    if(!syncIsConfigured()){ if(show) showToast('Configure a sincronização online primeiro.'); return; }
    if(!cloudSync.ready || !cloudSync.modules || !cloudSync.docRef){ if(show) showToast('Conectando ao Firebase...'); await initCloudSync(true); return; }
    try{
      const snap = await cloudSync.modules.getDoc(cloudSync.docRef);
      if(snap.exists()){
        const applied = applyRemoteSnapshot(snap.data());
        if(show) showToast(applied ? 'Dados online baixados para este aparelho.' : 'Este aparelho já está com a versão mais recente.');
      }else{
        if(show) showToast('Ainda não existe base online. Use “Enviar alterações para todos”.');
      }
    }catch(err){ console.warn(err); if(show) showToast('Não consegui baixar os dados online. Verifique permissões e internet.'); }
  }

  function applyRemoteSnapshot(remote){
    if(!remote || !remote.payload) return false;
    const remoteRevision = Number(remote.revision || remote.payload._revision || 0);
    const localRevision = Number(db._revision || 0);
    if(remoteRevision && remoteRevision <= localRevision) return false;
    cloudSync.applyingRemote = true;
    db = normalizeDB(remote.payload);
    db._revision = remoteRevision || Date.now();
    db._updatedAt = remote.updatedAt || new Date().toISOString();
    saveDB(db, false, {fromRemote:true, skipCloud:true});
    localStorage.removeItem(PENDING_SYNC_KEY);
    renderAll();
    cloudSync.applyingRemote = false;
    showToast('Informações atualizadas online.');
    return true;
  }

  function queueCloudPush(delay = 800){
    if(!syncIsConfigured() || !isAdmin) { renderSyncStatus(); return; }
    clearTimeout(cloudSync.pushTimer);
    cloudSync.pushTimer = setTimeout(() => pushCloudNow(false), delay);
    renderSyncStatus('Alteração salva localmente. Preparando envio online...');
  }

  async function pushCloudNow(show = true){
    if(!syncIsConfigured()){ if(show) showToast('Configure a sincronização online primeiro.'); return; }
    if(!isAdmin){ if(show) showToast('Entre como administrador para enviar alterações.'); return; }
    if(!cloudSync.ready || !cloudSync.modules || !cloudSync.docRef){
      await initCloudSync(true);
      if(!cloudSync.ready) { if(show) showToast('Sem conexão com Firebase. A alteração fica salva neste aparelho e será enviada quando houver internet.'); return; }
    }
    try{
      db._revision = Number(db._revision || Date.now());
      db._updatedAt = new Date().toISOString();
      await cloudSync.modules.setDoc(cloudSync.docRef, {
        app:'Grupo Louvor V.M.A',
        revision:db._revision,
        updatedAt:db._updatedAt,
        payload:clone(db)
      }, {merge:false});
      localStorage.removeItem(PENDING_SYNC_KEY);
      renderSyncStatus();
      if(show) showToast('Alterações enviadas. Os usuários receberão ao abrir com internet.');
    }catch(err){
      console.warn(err);
      localStorage.setItem(PENDING_SYNC_KEY, '1');
      renderSyncStatus('Não consegui enviar agora. Está salvo neste aparelho e tentará novamente quando houver internet.');
      if(show) showToast('Não consegui enviar online. Verifique regras do Firestore e internet.');
    }
  }

  function openLogin(){
    els.loginPass.value = '';
    els.loginDialog.showModal();
    setTimeout(() => els.loginPass.focus(), 100);
  }

  function handleLogin(ev){
    ev.preventDefault();
    const user = els.loginUser.value.trim().toLowerCase();
    const pass = els.loginPass.value;
    const stored = localStorage.getItem(PASS_KEY) || DEFAULT_PASSWORD;
    if(user === 'admin' && (pass === stored || pass === DEFAULT_PASSWORD || LEGACY_PASSWORDS.includes(pass))){
      isAdmin = true;
      els.loginDialog.close();
      showToast('Área administrativa liberada.');
      showAdmin();
    }else showToast('Usuário ou senha inválidos.');
  }

  function downloadSectionText(){
    const list = (db[currentSection] || []).filter(x => x.ativo || isAdmin).sort(sortItems);
    const content = list.map(item => `${item.numero !== '' ? String(item.numero).padStart(3,'0') + ' - ' : ''}${item.titulo}\n\n${item.texto || ''}${item.cifra ? '\n\nCifra:\n' + item.cifra : ''}${item.tom ? '\n\nTom: ' + item.tom : ''}${item.significado ? '\n\nSignificado:\n' + item.significado : ''}`).join('\n\n---\n\n');
    downloadFile(`${TYPE_LABEL[currentSection] || currentSection}.txt`, content, 'text/plain;charset=utf-8');
  }

  function downloadIcs(){
    const h = Object.assign(defaultHome(), db.home || {});
    if(!h.proximoEnsaioData){ showToast('Cadastre a data do ensaio no painel Admin.'); return; }
    const start = toIcsDate(h.proximoEnsaioData, h.proximoEnsaioHora || '19:00');
    const end = toIcsDate(h.proximoEnsaioData, h.proximoEnsaioFim || addOneHour(h.proximoEnsaioHora || '19:00'));
    const title = h.proximoEnsaioTitulo || 'Ensaio do Grupo de Louvor';
    const desc = `Escala da semana:\n${h.escalaSemana || ''}\n\nLouvores do ensaio:\n${h.louvoresEnsaio || ''}\n\nMensagem principal:\n${h.mensagemPrincipal || ''}`;
    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Grupo Louvor VMA//Sistema Offline//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
      `UID:${Date.now()}@grupo-louvor-vma`,
      `DTSTAMP:${toIcsStamp(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${icsEscape(title)}`,
      `LOCATION:${icsEscape(h.proximoEnsaioLocal || '')}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');
    downloadFile('proximo-ensaio-grupo-louvor.ics', ics, 'text/calendar;charset=utf-8');
  }

  function addOneHour(hhmm){
    const [h,m] = String(hhmm || '19:00').split(':').map(Number);
    return `${String((h+1)%24).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
  }
  function toIcsDate(date, time){ return String(date).replace(/-/g,'') + 'T' + String(time || '19:00').replace(':','') + '00'; }
  function toIcsStamp(d){ return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''); }
  function icsEscape(s){ return String(s || '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'); }

  function findItem(type, id){ return (db[type] || []).find(item => String(item.id) === String(id)); }
  function allItems(activeOnly = true){ return TYPES.flatMap(type => (db[type] || []).filter(item => !activeOnly || item.ativo).map(item => ({type,item}))); }

  function matchesQuery(entry, raw){
    const item = entry.item || entry;
    const q = normalize(raw);
    if(!q) return true;
    const num = String(item.numero ?? '');
    const padded = num && !Number.isNaN(Number(num)) ? String(num).padStart(3,'0') : '';
    if(/^\d+$/.test(q) && (q === num || q === padded || Number(q) === Number(num))) return true;
    const hay = normalize([entry.type, TYPE_LABEL[entry.type], item.numero, padded, item.titulo, item.categoria, item.data, formatDate(item.data), item.tom, item.texto, item.cifra, item.significado, item.observacoes, item.palavrasChave].join(' '));
    const ignored = new Set(['hino','harpa','numero','n','no','nº','louvor','louvores','crista','cristã','da','de','do','o','a','os','as']);
    const terms = q.split(/\s+/).filter(Boolean).filter(t => !ignored.has(t));
    return terms.every(term => hay.includes(term));
  }

  function snippet(entry, max = 160){
    const item = entry.item || entry;
    const src = item.significado || item.texto || item.cifra || item.observacoes || item.categoria || '';
    return src.length > max ? src.slice(0,max).trim() + '…' : src || 'Sem conteúdo cadastrado.';
  }

  function sortItems(a,b){
    if(Boolean(a.destaque) !== Boolean(b.destaque)) return a.destaque ? -1 : 1;
    const an = Number(a.numero), bn = Number(b.numero);
    if(!Number.isNaN(an) && !Number.isNaN(bn) && an !== bn) return an - bn;
    if(a.data && b.data && a.data !== b.data) return a.data.localeCompare(b.data);
    return String(a.titulo).localeCompare(String(b.titulo), 'pt-BR');
  }

  function firstLine(text, fallback){
    const line = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
    return line || fallback;
  }
  function normalize(value){ return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ç/g,'c').trim(); }
  function escapeHtml(s){ return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#96;'); }
  function nl2br(s){ return escapeHtml(s).replace(/\r?\n/g,'<br>'); }
  function formatDate(s){
    if(!s) return '';
    const [y,m,d] = String(s).split('-').map(Number);
    if(!y || !m || !d) return s;
    return new Date(y,m-1,d).toLocaleDateString('pt-BR');
  }

  function downloadFile(filename, content, type){
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showToast(message){
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => els.toast.classList.remove('show'), 3200);
  }

  function openAudioDB(){
    return new Promise((resolve,reject) => {
      const req = indexedDB.open(AUDIO_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(AUDIO_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function putAudioBlob(key, blob){
    const idb = await openAudioDB();
    return new Promise((resolve,reject) => {
      const tx = idb.transaction(AUDIO_STORE,'readwrite');
      tx.objectStore(AUDIO_STORE).put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  async function getAudioBlob(key){
    const idb = await openAudioDB();
    return new Promise((resolve,reject) => {
      const tx = idb.transaction(AUDIO_STORE,'readonly');
      const req = tx.objectStore(AUDIO_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function setupPwa(){
    refreshInstallButton();
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      refreshInstallButton();
    });
    window.addEventListener('appinstalled', () => {
      localStorage.setItem(INSTALLED_KEY, '1');
      deferredInstallPrompt = null;
      refreshInstallButton();
      showToast('App instalado com sucesso.');
    });
    els.installBtn.addEventListener('click', async () => {
      if(!deferredInstallPrompt){
        showToast('Use o menu do navegador e toque em “Adicionar à tela inicial”.');
        return;
      }
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice.catch(() => null);
      if(choice && choice.outcome === 'accepted') localStorage.setItem(INSTALLED_KEY, '1');
      deferredInstallPrompt = null;
      refreshInstallButton();
    });
    if('serviceWorker' in navigator){
      try{
        const reg = await navigator.serviceWorker.register('service-worker.js');
        reg.update().catch(()=>{});
        setInterval(() => reg.update().catch(()=>{}), 60 * 60 * 1000);
      }catch(err){ console.warn('Service Worker indisponível:', err); }
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if(refreshing) return; refreshing = true;
        window.location.reload();
      });
    }
  }

  function refreshInstallButton(){
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const installed = localStorage.getItem(INSTALLED_KEY) === '1';
    els.installBtn.hidden = standalone || installed || !deferredInstallPrompt;
  }

  async function forceUpdateApp(){
    try{
      if('caches' in window){
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if('serviceWorker' in navigator){
        const reg = await navigator.serviceWorker.getRegistration();
        if(reg){ await reg.update(); }
      }
      showToast('Buscando a versão mais recente...');
      setTimeout(() => window.location.reload(), 700);
    }catch(err){ console.warn(err); window.location.reload(); }
  }
})();
