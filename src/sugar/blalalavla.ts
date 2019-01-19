const crypto = require("crypto");
//regular expressions for gismu forms
const C = "(" + "[bcdfgjklmnprstvxz]" + ")";
const V = "(" + "[aeiou]" + ")";
const Vy = "(" + "[aeiouy]" + ")";
const D =
  "(" + "[bcfgkmpsvx][lr]|[td]r|[cs][pftkmn]|[jz][bvdgm]|t[cs]|d[jz]" + ")";
const C_C =
  "(" +
  "[bdgjvzcfkpstx][lrmn]|[lrn][bdgjvzcfkpstx]|b[dgjvz]|d[bgjvz]|g[bdjvz]|j[bdgv]|v[bdgjz]|z[bdgv]|c[fkpt]|f[ckpstx]|k[cfpst]|p[cfkstx]|s[fkptx]|t[cfkpsx]|x[fpst]|l[rmn]|r[lmn]|m[lrnbdgjvcfkpstx]|n[lrm]" +
  ")";
const R =
  "(" +
  "[lmnr][bcdfgjkpstvx]|l[mnrz]|mn|n[lmrz]|r[lmnz]|b[dgjmnvz]|d[bglmnv]|g[bdjmnvz]|[jz][lnr]|v[bdgjmnz]|f[ckmnpstx]|k[cfmnpst]|p[cfkmnstx]|sx|t[fklmnpx]|x[fmnpst]" +
  ")";
const CyC = `((${C})\\2|[bdgjvz][cfkpstx]|[cfkpstx][bdgjvz]|[cjsz]{2,2}|[ck]x|x[ck]|mz)`;
const T =
  "(cfr|cfl|sfr|sfl|jvr|jvl|zvr|zvl|cpr|cpl|spr|spl|jbr|jbl|zbr|zbl|ckr|ckl|skr|skl|jgr|jgl|zgr|zgl|ctr|str|jdr|zdr|cmr|cml|smr|sml|jmr|jml|zmr|zml)";
const CCV = `(${D}${V})`;
const CVV = `(${C}(?:ai|au|ei|oi|${V}'${V}))`;
const CVC = `(${C}${V}${C})`;

const asta = V + C_C + V;
const gismu = `(${D}${V}${C}|${C}${V}${C_C})${V}`;
const fragari = D + V + C + V + C + V;
const alpaka = V + R + V + C + V;
const sorpeka = C + V + R + V + C + V;
const strelka = T + V + R + V;
const univalsi = `(${gismu}|${fragari}|${alpaka}|${sorpeka}|${asta})`;

const RandExp = require("randexp");

module.exports = {
  cupra: function(url: string) {
    const R = new RandExp(univalsi);
    let gAcc = 0;
    R.randInt = (a: number, b: number) => {
      const seed =
        parseInt(
          crypto
            .createHash("md5")
            .update(url + gAcc)
            .digest("hex"),
          16
        ) /
        16 ** 32;
      gAcc++;
      return a + Math.floor(seed * (1 + b - a));
    };
    return R.gen();
  }
};
