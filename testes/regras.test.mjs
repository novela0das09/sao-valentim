// Testes das regras do Realtime Database no emulador.
// Personagens: gm (mestre), ana e beto (jogadores), ban (banido), zed (logado, mas estranho à mesa), anon (sem login).
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { ref, get, set, update, remove, push, query, orderByChild, equalTo } from 'firebase/database';

const regras = readFileSync(process.argv[2], 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-sv', database: { rules: regras, host: '127.0.0.1', port: 9000 } });
const res = []; let ok = 0, falhou = 0;
async function t(nome, deve, fn) {
  try { await (deve ? assertSucceeds(fn()) : assertFails(fn())); res.push(['OK  ', nome]); ok++; }
  catch (e) { res.push(['FALHOU', nome + ' → ' + String(e.message || e).split('\n')[0].slice(0, 160)]); falhou++; }
}
const fichaAna = { dono: 'ana', papel: 'pj', nome: 'Victor', json: '{"nome":"Victor"}', nivel: 3, nex: 5, perfil: 'vigilante', ocupacao: 'Professor', mec: 'M1', evol: false, habPerfil: { 2: 'vi-cobrir' }, t: 1 };
async function semeia() {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.database();
    await set(ref(db), {
      mesa: { mestres: { gm: true }, banidos: { ban: true }, travas: { p_beto2: true }, mural: { m1: { texto: 'aviso', t: 1 } }, cena3d: { noite: true }, regras: { json: '{}' }, cheia: { dias: 27 } },
      mestre: { textos: { p001: 'segredo da pista' } },
      users: { ana: { nome: 'Ana' }, beto: { nome: 'Beto' }, gm: { nome: 'Mestre' } },
      online: { ana: { t: 1 } },
      fichas: { ana1: fichaAna, beto1: Object.assign({}, fichaAna, { dono: 'beto', nome: 'Beto' }), npc1: { dono: '', papel: 'npc', nome: 'Padre', json: '{"segredo":"x"}', t: 1 } },
      npcs: { npc1: { nome: 'Padre', papel: 'npc' } },
      pecas: { p_ana: { dono: 'ana', x: 1, z: 1 }, p_beto: { dono: 'beto', x: 2, z: 2 }, p_ana2: { dono: 'ana', x: 3, z: 3 } },
      pecas_gm: { inimigo1: { nome: 'Coro', x: 0 } },
      rolagens: { ana: { r1: { tot: 10 } } },
      pedidos: { ana: { q1: { texto: 'posso?', t: 1 }, m1: { texto: 'só você ouve', t: 2, deMestre: true, feito: true } }, beto: { q2: { texto: 'oi', t: 1 } } },
      sons: { lib: { a1: { nome: 'x' } }, estado: { loops: { 'p:lago': 1 } }, auto: { ligado: true } },
      sons_arq: { a1: 'data:audio/mp3;base64,AAAA' },
      sons_priv: { ana: { id: 'p:sussurro', t: 1, n: 'x' }, beto: { id: 'p:sino', t: 1, n: 'y' } },
      call: { cfg: { aberta: true }, peers: { ana: { s: 1 } } },
      notas: { ana: { r: { x: 1 } }, gm: { m: { y: 1 } } },
    });
  });
}
await semeia();
const gm = env.authenticatedContext('gm').database(), ana = env.authenticatedContext('ana').database(), beto = env.authenticatedContext('beto').database();
const ban = env.authenticatedContext('ban').database(), zed = env.authenticatedContext('zed').database(), anon = env.unauthenticatedContext().database();
const r = (db, p) => ref(db, p);
const minhas = db => query(r(db, 'fichas'), orderByChild('dono'), equalTo('ana'));

// 1. fichas: só a própria
await t('1.1 Ana lê as próprias fichas (consulta por dono)', true, () => get(minhas(ana)));
await t('1.2 Ana lê todas as fichas', false, () => get(r(ana, 'fichas')));
await t('1.3 Ana lê a ficha do Beto direto', false, () => get(r(ana, 'fichas/beto1')));
await t('1.4 Ana consulta as fichas do Beto', false, () => get(query(r(ana, 'fichas'), orderByChild('dono'), equalTo('beto'))));
await t('1.5 Ana lê ficha de NPC (segredos)', false, () => get(r(ana, 'fichas/npc1')));
await t('1.6 Mestre lê todas as fichas', true, () => get(r(gm, 'fichas')));
await t('1.7 Ana grava a própria ficha mudando só nome e json', true, () => set(r(ana, 'fichas/ana1'), Object.assign({}, fichaAna, { nome: 'Victor 2', json: '{"nome":"Victor 2"}' })));
await t('1.8 Ana grava na ficha do Beto', false, () => update(r(ana, 'fichas/beto1'), { nome: 'hack' }));
await t('1.9 Ana passa a ficha dela para o Beto', false, () => update(r(ana, 'fichas/ana1'), { dono: 'beto' }));
await t('1.10 Ana transforma a ficha em NPC', false, () => update(r(ana, 'fichas/ana1'), { papel: 'npc' }));
await t('1.11 Ana apaga a ficha do Beto', false, () => remove(r(ana, 'fichas/beto1')));
// 2. nível, NEX, perfil, vocação
await t('2.1 Ana sobe o próprio nível', false, () => update(r(ana, 'fichas/ana1'), { nivel: 10 }));
await t('2.2 Ana muda o NEX', false, () => update(r(ana, 'fichas/ana1'), { nex: 99 }));
await t('2.3 Ana muda o perfil', false, () => update(r(ana, 'fichas/ana1'), { perfil: 'executor' }));
await t('2.4 Ana muda a vocação', false, () => update(r(ana, 'fichas/ana1'), { ocupacao: 'Policial' }));
await t('2.5 Ana apaga o campo nível', false, () => update(r(ana, 'fichas/ana1'), { nivel: null }));
await t('2.6 Ana cria ficha nova no nível 1 com NEX 0', true, () => set(r(ana, 'fichas/ana_nova'), { dono: 'ana', papel: 'pj', nome: 'Nova', json: '{}', nivel: 1, nex: 0, perfil: 'analista', ocupacao: 'Artista', mec: 'X', evol: false, t: 1 }));
await t('2.7 Ana cria ficha nova já no nível 5', false, () => set(r(ana, 'fichas/ana_nova2'), { dono: 'ana', papel: 'pj', nome: 'Nova', json: '{}', nivel: 5, nex: 0, t: 1 }));
await t('2.8 Ana cria ficha nova com NEX 40', false, () => set(r(ana, 'fichas/ana_nova3'), { dono: 'ana', papel: 'pj', nome: 'Nova', json: '{}', nivel: 1, nex: 40, t: 1 }));
await t('2.9 Ana cria ficha nova com evolução aberta', false, () => set(r(ana, 'fichas/ana_nova4'), { dono: 'ana', papel: 'pj', nome: 'Nova', json: '{}', nivel: 1, nex: 0, evol: true, t: 1 }));
await t('2.10 Ana cria ficha em nome do Beto', false, () => set(r(ana, 'fichas/beto_falsa'), { dono: 'beto', papel: 'pj', nome: 'x', json: '{}', nivel: 1, nex: 0, t: 1 }));
await t('2.11 Mestre sobe o nível da Ana', true, () => update(r(gm, 'fichas/ana1'), { nivel: 4 }));
await t('2.12 Mestre põe nível 11 (fora do limite)', false, () => update(r(gm, 'fichas/ana1'), { nivel: 11 }));
// 3. atributos e perícias (mec) e habilidades de perfil
await t('3.1 Ana muda atributos/perícias (mec) sem evolução aberta', false, () => update(r(ana, 'fichas/ana1'), { mec: 'M2' }));
await t('3.2 Ana abre a própria evolução', false, () => update(r(ana, 'fichas/ana1'), { evol: true }));
await t('3.3 Mestre abre a evolução da Ana', true, () => update(r(gm, 'fichas/ana1'), { evol: true }));
await t('3.4 Ana muda mec com a evolução aberta', true, () => update(r(ana, 'fichas/ana1'), { mec: 'M2' }));
await t('3.5 Ana fecha a evolução sozinha', false, () => update(r(ana, 'fichas/ana1'), { evol: false }));
await t('3.6 Mestre fecha a evolução', true, () => update(r(gm, 'fichas/ana1'), { evol: false }));
await t('3.7 Ana muda mec depois de fechada', false, () => update(r(ana, 'fichas/ana1'), { mec: 'M3' }));
await t('3.8 Ana escolhe habilidade do nível 3 (nível 4, Vigilante)', true, () => update(r(ana, 'fichas/ana1/habPerfil'), { 3: 'vi-olhos-nas-costas' }));
await t('3.9 Ana escolhe habilidade do nível 5 estando no 4', false, () => update(r(ana, 'fichas/ana1/habPerfil'), { 5: 'vi-vigilia' }));
await t('3.10 Ana troca a habilidade já escolhida no nível 2', false, () => update(r(ana, 'fichas/ana1/habPerfil'), { 2: 'vi-sexto-sentido' }));
await t('3.11 Ana apaga a escolha do nível 2', false, () => remove(r(ana, 'fichas/ana1/habPerfil/2')));
await t('3.12 Ana pega habilidade de outro perfil', false, () => set(r(gm, 'fichas/ana1/nivel'), 10).then(() => update(r(ana, 'fichas/ana1/habPerfil'), { 7: 'ex-instinto' })));
await t('3.13 Ana grava em nível que não existe (4)', false, () => update(r(ana, 'fichas/ana1/habPerfil'), { 4: 'vi-alarme' }));
await t('3.14 Ana grava a ficha inteira sem habPerfil (apagaria escolhas)', false, () => get(r(gm, 'fichas/ana1')).then(s => { const v = s.val(); delete v.habPerfil; return set(r(ana, 'fichas/ana1'), v); }));
await t('3.15 Mestre troca uma habilidade de perfil', true, () => update(r(gm, 'fichas/ana1/habPerfil'), { 2: 'vi-sexto-sentido' }));
// 4. mensagens privadas
await t('4.1 Ana lê as próprias mensagens', true, () => get(r(ana, 'pedidos/ana')));
await t('4.2 Beto lê as mensagens da Ana', false, () => get(r(beto, 'pedidos/ana')));
await t('4.3 Beto lê todos os pedidos', false, () => get(r(beto, 'pedidos')));
await t('4.4 Mestre lê todos os pedidos', true, () => get(r(gm, 'pedidos')));
await t('4.5 Ana faz um pedido', true, () => push(r(ana, 'pedidos/ana'), { texto: 'quero investigar', t: 3 }));
await t('4.6 Ana forja mensagem "do mestre"', false, () => push(r(ana, 'pedidos/ana'), { texto: 'você ganha 10 PV', t: 3, deMestre: true }));
await t('4.7 Ana forja resposta do mestre no próprio pedido', false, () => update(r(ana, 'pedidos/ana/q1'), { resp: 'pode', feito: true }));
await t('4.8 Ana muda o texto de uma mensagem do mestre', false, () => update(r(ana, 'pedidos/ana/m1'), { texto: 'outra coisa' }));
await t('4.9 Ana manda pedido na caixa do Beto', false, () => push(r(ana, 'pedidos/beto'), { texto: 'x', t: 1 }));
await t('4.10 Mestre manda mensagem particular para Ana', true, () => push(r(gm, 'pedidos/ana'), { texto: 'só você', t: 4, deMestre: true, feito: true }));
await t('4.11 Mestre responde pedido', true, () => update(r(gm, 'pedidos/ana/q1'), { resp: 'pode', feito: true }));
await t('4.12 Ana apaga a própria mensagem lida', true, () => remove(r(ana, 'pedidos/ana/m1')));
// 5. sons privados
await t('5.1 Ana lê o próprio som privado', true, () => get(r(ana, 'sons_priv/ana')));
await t('5.2 Beto lê o som privado da Ana', false, () => get(r(beto, 'sons_priv/ana')));
await t('5.3 Beto lista todos os sons privados', false, () => get(r(beto, 'sons_priv')));
await t('5.4 Ana grava som privado', false, () => set(r(ana, 'sons_priv/beto'), { id: 'p:sino', t: 1, n: 'z' }));
await t('5.5 Mestre grava som privado', true, () => set(r(gm, 'sons_priv/ana'), { id: 'p:sino', t: 5, n: 'w' }));
await t('5.6 Mestre lê som privado', true, () => get(r(gm, 'sons_priv/beto')));
// 6. funções que precisam continuar funcionando
await t('6.1 Ana lê os sons da mesa', true, () => get(r(ana, 'sons')));
await t('6.2 Ana lê arquivo de som', true, () => get(r(ana, 'sons_arq/a1')));
await t('6.3 Ana liga um som para todos', false, () => set(r(ana, 'sons/estado/loops/p:vento'), 1));
await t('6.4 Ana sobe arquivo de som', false, () => set(r(ana, 'sons_arq/a2'), 'data:'));
await t('6.5 Mestre liga som e cria regra automática', true, () => update(r(gm, 'sons'), { 'estado/loops/p:vento': 1, 'auto/regras/r1': { nome: 'x' } }));
await t('6.6 Ana lê o contador da cheia', true, () => get(r(ana, 'mesa/cheia')));
await t('6.7 Ana muda o contador', false, () => set(r(ana, 'mesa/cheia'), { dias: 1 }));
await t('6.8 Mestre muda o contador', true, () => set(r(gm, 'mesa/cheia'), { dias: 26 }));
await t('6.9 Ana lê a cena do mapa', true, () => get(r(ana, 'mesa/cena3d')));
await t('6.10 Ana muda a cena do mapa', false, () => set(r(ana, 'mesa/cena3d'), { noite: false }));
await t('6.11 Ana lê NPCs públicos', true, () => get(r(ana, 'npcs')));
await t('6.12 Ana grava NPC', false, () => set(r(ana, 'npcs/x'), { nome: 'x' }));
await t('6.13 Ana lê os textos secretos (pistas)', false, () => get(r(ana, 'mestre')));
await t('6.14 Mestre lê os textos secretos', true, () => get(r(gm, 'mestre/textos')));
await t('6.15 Ana grava textos secretos', false, () => set(r(ana, 'mestre/textos/p001'), 'falso'));
await t('6.16 Ana lê peças do mapa', true, () => get(r(ana, 'pecas')));
await t('6.17 Ana move a própria peça', true, () => update(r(ana, 'pecas/p_ana'), { x: 5 }));
await t('6.18 Ana move a peça do Beto', false, () => update(r(ana, 'pecas/p_beto'), { x: 5 }));
await t('6.19 Ana toma a peça do Beto', false, () => update(r(ana, 'pecas/p_beto'), { dono: 'ana' }));
await t('6.20 Ana lê peças escondidas do mestre', false, () => get(r(ana, 'pecas_gm')));
await t('6.21 Ana grava a própria rolagem', true, () => push(r(ana, 'rolagens/ana'), { tot: 12 }));
await t('6.22 Ana grava rolagem no nome do Beto', false, () => push(r(ana, 'rolagens/beto'), { tot: 99 }));
await t('6.23 Ana apaga todas as rolagens', false, () => remove(r(ana, 'rolagens')));
await t('6.24 Ana lê as próprias anotações', true, () => get(r(ana, 'notas/ana')));
await t('6.25 Ana lê as anotações do mestre', false, () => get(r(ana, 'notas/gm')));
await t('6.26 Ana entra na call', true, () => set(r(ana, 'call/peers/ana'), { s: 2 }));
await t('6.27 Ana mexe na configuração da call', false, () => update(r(ana, 'call/cfg'), { aberta: false }));
await t('6.28 Ana tira o Beto da call', false, () => remove(r(ana, 'call/peers/beto')));
await t('6.29 Ana lê o sinal de voz do Beto', false, () => get(r(ana, 'call/sig/beto')));
await t('6.30 Ana manda sinal de voz para o Beto', true, () => set(r(ana, 'call/sig/beto/ana/x1'), { tipo: 'oferta' }));
await t('6.31 Ana atualiza o próprio usuário e o online', true, () => Promise.all([update(r(ana, 'users/ana'), { nome: 'Ana B' }), update(r(ana, 'online/ana'), { t: 2 })]));
await t('6.32 Ana muda o usuário do Beto', false, () => update(r(ana, 'users/beto'), { nome: 'x' }));
await t('6.33 Ana lê a mesa (mural, regras)', true, () => get(r(ana, 'mesa')));
// 7. administração
await t('7.1 Ana se faz mestre (já existe mestre)', false, () => set(r(ana, 'mesa/mestres/ana'), true));
await t('7.2 Ana tira o mestre', false, () => remove(r(ana, 'mesa/mestres/gm')));
await t('7.3 Ana bane o Beto', false, () => set(r(ana, 'mesa/banidos/beto'), true));
await t('7.4 Banido se desbane', false, () => remove(r(ban, 'mesa/banidos/ban')));
await t('7.5 Ana trava/destrava peças', false, () => remove(r(ana, 'mesa/travas/p_beto2')));
await t('7.6 Ana muda as regras da casa', false, () => update(r(ana, 'mesa/regras'), { json: '{"hack":1}' }));
await t('7.7 Ana prega no mural', false, () => push(r(ana, 'mesa/mural'), { texto: 'x', t: 1 }));
await t('7.8 Mestre torna a Ana mestre', true, () => set(r(gm, 'mesa/mestres/ana'), true));
await t('7.9 Mestre grava "mestre = sim" com valor estranho', false, () => set(r(gm, 'mesa/mestres/beto'), 'sim'));
// 8. caminhos amplos e gente de fora
await t('8.1 Sem login lê a mesa', false, () => get(r(anon, 'mesa')));
await t('8.2 Sem login lê usuários', false, () => get(r(anon, 'users')));
await t('8.3 Ninguém lê a raiz do banco', false, () => get(r(ana, '/')));
await t('8.4 Ana grava num caminho inventado', false, () => set(r(ana, 'qualquer/coisa'), 1));
await t('8.5 Banido grava a própria ficha', false, () => set(r(ban, 'fichas/ban1'), { dono: 'ban', papel: 'pj', json: '{}', nivel: 1, nex: 0, t: 1 }));
await t('8.6 Banido lê usuários', false, () => get(r(ban, 'users')));
await t('8.7 Estranho logado (não convidado) lê usuários', true, () => get(r(zed, 'users')));
await t('8.8 Estranho logado cria ficha de jogador para si', true, () => set(r(zed, 'fichas/zed1'), { dono: 'zed', papel: 'pj', json: '{}', nivel: 1, nex: 0, t: 1 }));
await t('8.9 Ana grava na raiz', false, () => update(r(ana, '/'), { mesa: null }));
// 10. marcadores do mapa (amarelo e azul) e trilha: tudo em mestre/, só o mestre
await semeia();
await env.withSecurityRulesDisabled(async c => { const db = c.database();
  await set(ref(db, 'mestre/objetos/o1'), { cena: 'vale', x: 1, y: 0, z: 2, nome: 'Caixa', estado: 'escondido', item: { nome: 'Lanterna', qtd: 1 } });
  await set(ref(db, 'mestre/pistas3d/p1'), { cena: 'vale', x: 0, y: 0, z: 0, titulo: 'segredo' });
  await set(ref(db, 'mestre/trilha'), { versao: 1, faixas: { a: { nome: 'x' } } }); });
await t('10.1 Ana lê os objetos (azul)', false, () => get(r(ana, 'mestre/objetos')));
await t('10.2 Ana lê as pistas do mapa (amarelo)', false, () => get(r(ana, 'mestre/pistas3d')));
await t('10.3 Ana lê o catálogo da trilha', false, () => get(r(ana, 'mestre/trilha')));
await t('10.4 Ana escreve num objeto', false, () => update(r(ana, 'mestre/objetos/o1'), { estado: 'recolhido' }));
await t('10.5 Não existe caminho público de objetos', false, () => set(r(ana, 'objetos/o1'), { estado: 'recolhido' }));
await t('10.6 Mestre entrega o objeto', true, () => update(r(gm, 'mestre/objetos/o1'), { estado: 'recolhido', recolhidoPor: { fid: 'ana1', nome: 'Ana' } }));
await t('10.7 Mestre lê o catálogo da trilha', true, () => get(r(gm, 'mestre/trilha')));
await t('10.8 Mestre toca uma música para todos', true, () => set(r(gm, 'sons/estado/musica'), { id: 'a:x', loop: true, n: 'n1', t: 1 }));
await t('10.9 Ana troca a música', false, () => set(r(ana, 'sons/estado/musica'), { corte: true }));
await t('10.10 Mestre guarda música em partes', true, () => set(r(gm, 'sons_arq/k1_p1'), 'data:abc'));
await t('10.11 Ana lê a música', true, () => get(r(ana, 'sons_arq/k1_p1')));
// 9. primeiro mestre de uma mesa vazia
await env.clearDatabase();
await t('9.1 Mesa vazia: primeira pessoa vira mestre', true, () => set(r(zed, 'mesa/mestres/zed'), true));
await t('9.2 Depois disso, outra pessoa não vira mestre', false, () => set(r(ana, 'mesa/mestres/ana'), true));

for (const [s, n] of res) console.log(s, n);
console.log(`\n${ok} aprovados, ${falhou} reprovados, ${ok + falhou} testes`);
await env.cleanup();
process.exit(falhou ? 1 : 0);
