import { createHash } from 'node:crypto';
import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from './decorators/public.decorator.js';

/**
 * Page ouverte depuis le lien de l'e-mail « mot de passe oublié ».
 * Le code et l'e-mail voyagent dans le fragment d'URL (#...) : ils ne sont jamais envoyés au
 * serveur (donc absents des journaux d'accès). Le script local tente d'ouvrir l'application
 * (schéma d'URL) et propose un bouton « Copier le code ».
 */
@ApiExcludeController()
@Controller('v1/auth')
export class OpenAppController {
  private readonly html: string;
  private readonly csp: string;

  constructor(config: ConfigService) {
    const scheme = (config.get<string>('APP_SCHEME') ?? 'muscleup').replace(/[^a-z0-9+.-]/gi, '');
    const script = buildScript(scheme);
    const hash = createHash('sha256').update(script).digest('base64');
    this.html = PAGE.replace('/*SCRIPT*/', () => script);
    this.csp = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
  }

  @Public()
  @Get('open-app')
  openApp(@Res() res: Response) {
    res
      .set({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': this.csp,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex',
      })
      .send(this.html);
  }
}

const I18N = {
  fr: { title: 'Réinitialisation du mot de passe', hint: 'Ouvrez l\'application pour continuer. Si rien ne se passe, copiez le code et collez-le dans l\'application.', open: 'Ouvrir l\'application', copy: 'Copier le code', copied: 'Code copié ✓', invalid: 'Lien invalide ou incomplet. Redemandez un code depuis l\'application.' },
  en: { title: 'Password reset', hint: 'Open the app to continue. If nothing happens, copy the code and paste it in the app.', open: 'Open the app', copy: 'Copy the code', copied: 'Code copied ✓', invalid: 'Invalid or incomplete link. Request a new code from the app.' },
  ar: { title: 'إعادة تعيين كلمة المرور', hint: 'افتح التطبيق للمتابعة. إذا لم يحدث شيء، انسخ الرمز والصقه في التطبيق.', open: 'فتح التطبيق', copy: 'نسخ الرمز', copied: 'تم النسخ ✓', invalid: 'رابط غير صالح أو ناقص. اطلب رمزًا جديدًا من التطبيق.' },
};

function buildScript(scheme: string): string {
  return `
var T=${JSON.stringify(I18N)};
var p=new URLSearchParams(location.hash.slice(1));
var lang=T[p.get('l')]?p.get('l'):'fr',t=T[lang],email=p.get('e')||'',code=p.get('c')||'';
document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
var $=function(id){return document.getElementById(id)};
$('title').textContent=t.title;
if(!/^\\d{6}$/.test(code)||!/^[^\\s@]+@[^\\s@]+$/.test(email)){$('hint').textContent=t.invalid;$('box').style.display='none';}
else{
  var link='${scheme}://forgot-password?email='+encodeURIComponent(email)+'&code='+encodeURIComponent(code);
  $('hint').textContent=t.hint;$('code').textContent=code;
  $('open').textContent=t.open;$('open').href=link;$('copy').textContent=t.copy;
  $('copy').onclick=function(){
    var done=function(){$('copy').textContent=t.copied};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(done,fallback)}else{fallback()}
    function fallback(){var r=document.createRange();r.selectNodeContents($('code'));var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy');done()}catch(e){}}
  };
  setTimeout(function(){location.href=link},400);
}
`;
}

const PAGE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>MuscleUP</title>
<style>
body{margin:0;background:#F4F2F8;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1B1530;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.card{background:#fff;border-radius:20px;box-shadow:0 2px 12px rgba(20,10,50,.08);max-width:420px;width:100%;padding:28px 24px;text-align:center}
h1{font-size:20px;margin:0 0 10px}p{font-size:14.5px;line-height:1.55;color:#3D3556;margin:0 0 18px}
.code{font-family:Menlo,Consolas,monospace;font-size:36px;font-weight:800;letter-spacing:6px;background:#EFE9FD;border:1px solid #D8C8FA;border-radius:16px;padding:16px 8px;margin-bottom:16px;direction:ltr;user-select:all}
a.btn,button{display:block;width:100%;box-sizing:border-box;font:inherit;font-weight:700;font-size:16px;padding:14px;border-radius:12px;text-decoration:none;cursor:pointer;margin-top:10px}
a.btn{background:#7C3AED;color:#fff;border:0}button{background:#fff;color:#572AA6;border:1.5px solid #D8C8FA}
</style></head>
<body><div class="card"><h1 id="title"></h1><p id="hint"></p>
<div id="box"><div class="code" id="code"></div><a class="btn" id="open" href="#"></a><button id="copy" type="button"></button></div></div>
<script>/*SCRIPT*/</script></body></html>`;
