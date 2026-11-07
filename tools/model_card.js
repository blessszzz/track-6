/* ---------- model card ---------- */
function buildCard(){
  const t=T(), d=METRICS.deployed_test, sp=METRICS.split;
  const pct=x=>Math.round(x*100)+"%";
  const tiles=[["ROC-AUC",d.roc_auc.toFixed(3)],["PR-AUC",d.pr_auc.toFixed(3)],[t.sens,pct(d.sensitivity)],[t.spec,pct(d.specificity)],["NPV",pct(d.npv)],["PPV",pct(d.ppv)]]
    .map(([l,x])=>`<div class="tile"><div class="v">${x}</div><div class="l">${esc(l)}</div></div>`).join("");
  const bench=Object.entries(METRICS.benchmarks).map(([k,x])=>`<tr><td>${esc(k)}</td><td class="num">${x.roc_auc.toFixed(3)}</td><td class="num">${x.pr_auc.toFixed(3)}</td><td class="num">${x.brier.toFixed(3)}</td></tr>`).join("");
  const fair=FAIR.map(r=>`<tr><td>${esc(r.attribute.replace(" (audit only)",""))}</td><td>${esc(r.group)}</td><td class="num">${r.n.toLocaleString("en")}</td>
    <td class="num">${pct(r.prevalence)}</td><td class="num"><span class="mbar" style="width:${Math.round(r.sensitivity*70)}px"></span>${pct(r.sensitivity)}</td>
    <td class="num">${pct(r.false_positive_rate)}</td></tr>`).join("");
  $("mc").innerHTML=`
  <div><h2>${esc(t.tab_model)}</h2><div class="small">${esc(t.mc_intro)}</div></div>
  <div><h3>${esc(t.mc_data)}</h3>BRFSS 2015 (CDC) · ${METRICS.n_rows.toLocaleString("en")} · ${esc(t.prev)} ${(METRICS.prevalence*100).toFixed(1)}% · train/val/test ${sp.train.toLocaleString("en")} / ${sp.val.toLocaleString("en")} / ${sp.test.toLocaleString("en")}</div>
  <div><h3>${esc(t.mc_perf)}</h3><div class="tiles">${tiles}</div></div>
  <div><h3>${esc(t.mc_bench)}</h3><div class="scroll"><table><thead><tr><th></th><th class="num">ROC-AUC</th><th class="num">PR-AUC</th><th class="num">Brier</th></tr></thead><tbody>${bench}</tbody></table></div></div>
  <div><h3>${esc(t.mc_fair)}</h3><div class="small" style="margin-bottom:8px">${esc(t.mc_fair_note)}</div>
   <div class="scroll"><table><thead><tr><th></th><th></th><th class="num">n</th><th class="num">${esc(t.prev)}</th><th class="num">${esc(t.sens)}</th><th class="num">${esc(t.fpr)}</th></tr></thead><tbody>${fair}</tbody></table></div></div>
  <div><h3>${esc(t.mc_limits)}</h3><ul class="lim">${t.mc_limits_list.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
}

