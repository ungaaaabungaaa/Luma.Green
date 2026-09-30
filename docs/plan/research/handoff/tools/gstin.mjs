const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function checkChar(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = ALPHABET.indexOf(first14[i]);
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return ALPHABET[(36 - (sum % 36)) % 36];
}
const known = ["27AAPFU0939F1ZV", "29AAACR5055K1Z5", "07AAGFF2194N1Z1", "33GSPTN0471G1ZW"];
for (const g of known) console.log(g, checkChar(g.slice(0, 14)), g[14] === checkChar(g.slice(0, 14)) ? "VALID" : "invalid");
const existing = ["29ABCPE1234F1Z5","29AAHMY5678K1Z2","29AAGCG4321L1Z8","29AABCB7788M1Z3","29AADCD9900P1Z6","29AAECK1122Q1Z9","29AAIFI3344R1Z1"];
for (const g of existing) console.log("existing", g, "expected", checkChar(g.slice(0,14)), g[14] === checkChar(g.slice(0,14)) ? "VALID!!" : "fails");
const mine = ["29AAYDW1122D1Z", "29AABCM4455E1Z", "29AAFCD6677G1Z", "29AAGCH8899J1Z", "29AAKCM2233N1Z", "29AAQCY5566R1Z", "29AAHCS7788T1Z"];
for (const g of mine) console.log("new", g, "valid check would be", checkChar(g));
