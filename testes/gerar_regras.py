"""Gera database.rules.json (versão revisada em 15/11/2026). Rode: python regras.py <saída>"""
import json, sys
GM = "root.child('mesa/mestres/' + auth.uid).val() === true"
DENTRO = "auth != null && root.child('mesa/banidos/' + auth.uid).val() !== true"
SO_GM = f"auth != null && {GM}"
NIVEIS = ['2', '3', '5', '7', '9', '10']
PREF = "((newData.parent().parent().child('perfil').val() === 'executor' && newData.val().beginsWith('ex-')) || (newData.parent().parent().child('perfil').val() === 'analista' && newData.val().beginsWith('an-')) || (newData.parent().parent().child('perfil').val() === 'vigilante' && newData.val().beginsWith('vi-')))"

# ---------- fichas: o que o jogador pode gravar na própria ficha ----------
mesmo = lambda c: f"newData.child('{c}').val() === data.child('{c}').val()"
hp_mantem = " && ".join(f"(!data.child('habPerfil/{n}').exists() || newData.child('habPerfil/{n}').val() === data.child('habPerfil/{n}').val())" for n in NIVEIS)
jogador_ficha = (
    f"{DENTRO}"
    " && (!data.exists() || data.child('dono').val() === auth.uid)"
    " && (!newData.exists() || ("
    "newData.child('dono').val() === auth.uid && newData.child('papel').val() === 'pj'"
    " && (data.exists()"
    f" ? ({mesmo('nivel')} && {mesmo('nex')} && {mesmo('perfil')} && {mesmo('ocupacao')} && {mesmo('evol')}"
    f" && (data.child('evol').val() === true || {mesmo('mec')})"
    f" && {hp_mantem})"
    " : (newData.child('nivel').val() === 1 && newData.child('nex').val() === 0 && newData.child('evol').val() !== true && !newData.child('habPerfil').exists()))"
    "))"
)
hp_valida = {n: {".validate": f"newData.isString() && newData.val().length <= 40 && ({GM} || (newData.parent().parent().child('nivel').val() >= {n} && {PREF}))"} for n in NIVEIS}
hp_valida["$outro"] = {".validate": False}

R = {"rules": {
  ".read": False, ".write": False,
  "mesa": {
    ".read": "auth != null",
    "mestres": {"$uid": {
      ".write": f"auth != null && ({GM} || ($uid === auth.uid && !root.child('mesa/mestres').exists()))",
      ".validate": "newData.val() === true"}},
    "banidos": {".write": SO_GM, "$uid": {".validate": "newData.val() === true"}},
    "travas": {".write": SO_GM},
    "mural": {".write": SO_GM},
    "cena3d": {".write": SO_GM},
    "regras": {".write": SO_GM},
    "cheia": {".write": SO_GM},
  },
  "mestre": {".read": SO_GM, ".write": SO_GM},
  "users": {".read": DENTRO, "$uid": {".write": "auth != null && auth.uid === $uid"}},
  "online": {".read": DENTRO, "$uid": {".write": "auth != null && auth.uid === $uid"}},
  "fichas": {
    ".read": f"auth != null && ({GM} || ({DENTRO} && query.orderByChild === 'dono' && query.equalTo === auth.uid))",
    ".indexOn": ["dono"],
    "$id": {
      ".write": f"auth != null && ({GM} || ({jogador_ficha}))",
      "dono": {".validate": "newData.isString()"},
      "papel": {".validate": "newData.val() === 'pj' || newData.val() === 'npc' || newData.val() === 'inimigo'"},
      "json": {".validate": "newData.isString() && newData.val().length < 2000000"},
      "mec": {".validate": "newData.isString() && newData.val().length < 20000"},
      "nivel": {".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 10"},
      "nex": {".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 99"},
      "evol": {".validate": "newData.isBoolean()"},
      "habPerfil": hp_valida,
    },
  },
  "npcs": {".read": DENTRO, ".write": SO_GM},
  "pecas": {".read": DENTRO, "$id": {
    ".write": f"auth != null && ({GM} || ({DENTRO} && root.child('mesa/travas/' + $id).val() !== true && (!data.exists() || data.child('dono').val() === auth.uid) && (!newData.exists() || newData.child('dono').val() === auth.uid)))"}},
  "pecas_gm": {".read": SO_GM, ".write": SO_GM},
  "rolagens": {".read": DENTRO, ".write": SO_GM, "$uid": {".write": f"{DENTRO} && auth.uid === $uid"}},
  "pedidos": {
    ".read": SO_GM, ".write": SO_GM,
    "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": f"{DENTRO} && auth.uid === $uid",
      "$id": {".validate": f"{GM} || (!newData.child('deMestre').exists() && (data.exists() ? (newData.child('resp').val() === data.child('resp').val() && newData.child('feito').val() === data.child('feito').val() && newData.child('texto').val() === data.child('texto').val()) : (!newData.child('resp').exists() && !newData.child('feito').exists())))"},
    },
  },
  "sons": {".read": DENTRO, ".write": SO_GM},
  "sons_arq": {".read": DENTRO, ".write": SO_GM, "$id": {".validate": "newData.isString() && newData.val().length < 4500000"}},
  "sons_priv": {"$uid": {".read": f"auth != null && (auth.uid === $uid || {GM})", ".write": SO_GM}},
  "call": {
    "cfg": {".read": DENTRO, ".write": SO_GM},
    "peers": {".read": DENTRO, "$uid": {".write": f"auth != null && ((auth.uid === $uid && (root.child('mesa/banidos/' + auth.uid).val() !== true || !newData.exists())) || {GM})"}},
    "sig": {"$to": {
      ".read": "auth != null && auth.uid === $to",
      ".write": "auth != null && auth.uid === $to && !newData.exists()",
      "$from": {".write": f"{DENTRO} && (auth.uid === $from || (auth.uid === $to && !newData.exists()))"}}},
  },
  "notas": {"$uid": {".read": "auth != null && auth.uid === $uid", ".write": f"{DENTRO} && auth.uid === $uid"}},
}}
# objetos coletáveis (azul) e pistas (amarelo) ficam só em mestre/, que só o mestre lê: nenhuma regra nova
json.dump(R, open(sys.argv[1], 'w', encoding='utf-8', newline=''), ensure_ascii=False, indent=2)
print('ok')
