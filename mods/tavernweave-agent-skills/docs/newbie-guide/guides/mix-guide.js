(async () => {
  const diagrams = [...document.querySelectorAll('.mermaid')];
  const sources = new Map(diagrams.map(element => [element, element.textContent]));

  function fallback(element) {
    element.replaceChildren();
    element.classList.add('diagram-fallback');
    const message = document.createElement('p');
    message.textContent = '流程圖暫時沒有加載出來。可先看本節緊隨其後的步驟表；下面保留流程圖文字，聯網後重新整理可重試。';
    const source = document.createElement('pre');
    source.textContent = sources.get(element);
    element.append(message, source);
  }

  function load(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      const timeout = setTimeout(() => { script.remove(); reject(new Error('Diagram library timeout')); }, 8000);
      script.onload = () => { clearTimeout(timeout); resolve(); };
      script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Diagram library unavailable')); };
      document.head.append(script);
    });
  }

  for (const url of [
    'https://testingcf.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
    'https://fastly.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
  ]) {
    try { await load(url); if (window.mermaid) break; } catch { /* Try the alternate CDN. */ }
  }
  if (!window.mermaid) { diagrams.forEach(fallback); return; }
  window.mermaid.initialize({
    startOnLoad: false, securityLevel: 'strict', theme: 'base',
    themeVariables: { fontSize: '13.5px', primaryColor: '#eef5ff', primaryBorderColor: '#0969da', lineColor: '#57606a', fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif' },
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', nodeSpacing: 34, rankSpacing: 40 },
  });
  for (const element of diagrams) {
    element.tabIndex = 0;
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', '流程圖，窄屏可左右滑動');
    try {
      await window.mermaid.run({ nodes: [element] });
      const svg = element.querySelector('svg');
      if (svg) svg.style.setProperty('--diagram-width', `${svg.viewBox.baseVal.width}px`);
    }
    catch { fallback(element); }
  }
})();
