
let consoles = [];
let allGames = [];
let currentView = 'all'; // 'all', 'Console', 'VR', 'game'
const cardsEl = document.getElementById('cards');
const searchInput = document.getElementById('search');
const botao = document.getElementById('botao-busca');
const noResults = document.getElementById('noResults');
const header = document.getElementById('site-header');
let io;

const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const zoomOverlay = document.getElementById('zoom-overlay');
const zoomedImage = document.getElementById('zoomed-image');
const zoomClose = document.getElementById('zoom-close');

async function carregarDados(){
  try{
    const res = await fetch('data.json');
    consoles = await res.json();
    generateGamesList();
    render(consoles);
    observeCards();
  }catch(e){
    console.error('Erro ao carregar data.json', e);
    cardsEl.innerHTML = '<p style="color:salmon">Erro ao carregar dados.</p>';
  }
}

function generateGamesList() {
  allGames = [];
  consoles.forEach(consoleItem => {
    if (consoleItem.principais_jogos) {
      consoleItem.principais_jogos.forEach(game => {
        // Adiciona uma referência de volta ao console para cada jogo
        allGames.push({ ...game, console: consoleItem });
      });
    }
  });
}

function criarCard(item){
  const jogos = (item.principais_jogos || []).slice(0,3).map(j=>`<li>${escapeHtml(j.nome)} (${j.ano})</li>`).join('');
  const obs = item.observacoes ? `<p class="meta">${escapeHtml(item.observacoes)}</p>` : '';
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <h2 class="card-title">${escapeHtml(item.nome)}</h2>
    <div class="meta">Fabricante: ${escapeHtml(item.fabricante)} • ${escapeHtml(String(item.ano_lancamento||'—'))} • ${escapeHtml(item.geracao||'')}</div>
    ${obs}
    <div><strong>Principais jogos:</strong><ul>${jogos}</ul></div>
    <div class="tags"><span class="tag">${escapeHtml(item.tipo||'')}</span><span class="tag">${escapeHtml(item.status||'')}</span></div>
  `;
  el.addEventListener('click', () => {
    abrirModal(item);
  });
  return el;
}

function criarJogoCard(gameItem) {
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <h2 class="card-title">${escapeHtml(gameItem.nome)}</h2>
    <div class="meta">Ano: ${escapeHtml(String(gameItem.ano || '—'))}</div>
    <div class="meta">Console: ${escapeHtml(gameItem.console.nome)}</div>
    <div class="meta">Engine: ${escapeHtml(gameItem.engine || 'N/A')}</div>
    <div class="tags">
      <span class="tag">${escapeHtml(gameItem.console.fabricante)}</span>
      <span class="tag">${escapeHtml(gameItem.console.categoria)}</span>
    </div>
  `;
  // Clicar no card do jogo abre o modal do console correspondente
  el.addEventListener('click', () => {
    abrirModal(gameItem.console);
  });
  return el;
}

function render(list){
  cardsEl.innerHTML = '';
  if(!list.length){ noResults.style.display = 'block'; return; }
  noResults.style.display = 'none';
  const frag = document.createDocumentFragment();

  if (currentView === 'game') {
    list.forEach(i => frag.appendChild(criarJogoCard(i)));
  } else {
    list.forEach(i => frag.appendChild(criarCard(i)));
  }

  cardsEl.appendChild(frag);
}

function Buscar(){
  const q = searchInput.value.trim().toLowerCase();

  if (currentView === 'game') {
    const data = q ? allGames.filter(game => game.nome.toLowerCase().includes(q) || String(game.ano).includes(q) || game.console.nome.toLowerCase().includes(q) || (game.engine && game.engine.toLowerCase().includes(q))) : allGames;
    render(data);
  } else {
    let data = consoles;
    if (currentView !== 'all') {
      data = consoles.filter(item => item.categoria === currentView);
    }

    if (q) {
      data = data.filter(item=> {
        return (item.nome && item.nome.toLowerCase().includes(q)) ||
               (item.fabricante && item.fabricante.toLowerCase().includes(q)) ||
               (item.geracao && item.geracao.toLowerCase().includes(q)) ||
               (item.tipo && item.tipo.toLowerCase().includes(q)) ||
               (item.categoria && item.categoria.toLowerCase().includes(q));
      });
    }
    render(data);
  }

  observeCards();
}

let timer;
searchInput.addEventListener('input', ()=>{ clearTimeout(timer); timer = setTimeout(Buscar, 250); });
botao.addEventListener('click', Buscar);
document.querySelector('#site-header h1').addEventListener('click', () => {
  searchInput.value = '';
  currentView = 'all';
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.category === 'all') {
      btn.classList.add('active');
    }
  });
  render(consoles);
  observeCards();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter-btn.active').classList.remove('active');
    btn.classList.add('active');
    currentView = btn.dataset.category;
    Buscar(); // Re-executa a busca/renderização com a nova visão
  });
});

window.addEventListener('scroll', ()=> {
  if(window.scrollY > 8) header.classList.add('scrolled'); else header.classList.remove('scrolled');
});

function observeCards(){
  if(io) io.disconnect();
  const nodes = document.querySelectorAll('.card');
  io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){ entry.target.classList.add('visible'); entry.target.classList.remove('hidden'); }
      else { entry.target.classList.remove('visible'); }
    });
  }, {threshold:0.12});
  nodes.forEach(n=> io.observe(n));
}

function abrirModal(item) {
  if (!modalOverlay || !modalContent) return; // Não faz nada se o modal não existir

  const jogos = (item.principais_jogos || []).map(j => {
    const nomeJogo = `${escapeHtml(j.nome)} (${j.ano}) - <i>${escapeHtml(j.engine || 'N/A')}</i>`;
    if (j.link_oficial) {
      return `<li><a href="${j.link_oficial}" target="_blank" rel="noopener noreferrer">${nomeJogo}</a></li>`;
    }
    return `<li>${nomeJogo}</li>`;
  }).join('');

  const obs = item.observacoes ? `<p class="meta">${escapeHtml(item.observacoes)}</p>` : '';
  const imagem = item.imagem_url ? `<img src="img/${item.imagem_url}" alt="Imagem do console ${escapeHtml(item.nome)}" class="modal-image">` : '';
  const linkOficial = item.link_oficial ? `<a href="${item.link_oficial}" target="_blank" rel="noopener noreferrer" class="modal-link-btn">Site Oficial</a>` : '';

  modalContent.innerHTML = `
    <button id="modal-close" class="modal-close" title="Fechar">&times;</button>
    <h2 class="card-title">${escapeHtml(item.nome)}</h2>
    ${imagem}
    <div class="meta">Fabricante: ${escapeHtml(item.fabricante)}</div>
    <div class="meta">Lançamento: ${escapeHtml(String(item.ano_lancamento||'—'))}</div>
    <div class="meta">Geração: ${escapeHtml(item.geracao||'')}</div>
    ${obs}
    <br>
    <div><strong>Principais jogos:</strong><ul>${jogos}</ul></div>
    ${linkOficial}
    <div class="tags"><span class="tag">${escapeHtml(item.tipo||'')}</span><span class="tag">${escapeHtml(item.status||'')}</span></div>
  `;
  // O botão de fechar é recriado, então precisamos pegar o evento dele de novo
  modalContent.querySelector('.modal-close').addEventListener('click', fecharModal);

  // Adiciona evento de clique na imagem do modal para dar zoom
  const modalImage = modalContent.querySelector('.modal-image');
  if (modalImage) {
    modalImage.addEventListener('click', () => abrirZoom(modalImage.src));
  }

  modalOverlay.classList.add('active');
}

function fecharModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('active');
}

function abrirZoom(src) {
  if (!zoomOverlay || !zoomedImage) return;
  zoomedImage.setAttribute('src', src);
  zoomOverlay.classList.add('active');
}

function fecharZoom() {
  if (!zoomOverlay) return;
  zoomOverlay.classList.remove('active');
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) fecharModal(); });
}

if (zoomOverlay) {
  zoomOverlay.addEventListener('click', fecharZoom); // Fecha ao clicar no fundo ou no botão
}

// Adiciona evento para fechar o modal com a tecla "Esc"
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
    fecharModal();
  }
});

function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

carregarDados();