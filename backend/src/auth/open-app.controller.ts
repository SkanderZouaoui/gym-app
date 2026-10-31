import { createHash } from 'node:crypto';
import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from './decorators/public.decorator.js';
import { HERO_JPG_BASE64 } from '../mail/assets.js';

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
    this.html = PAGE.replace('/*SCRIPT*/', () => script).replace('/*HERO*/', () => `data:image/jpeg;base64,${HERO_JPG_BASE64}`);
    this.csp = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
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
  fr: { title: 'Réinitialisation du mot de passe', hint: 'Ouvrez l\'application pour continuer. Si rien ne se passe, copiez le code et collez-le dans l\'application.', hintE: 'Copiez ce code et collez-le dans l\'application pour confirmer votre nouvelle adresse e-mail.', hintCopy: 'Copiez le code, puis collez-le dans l\'application.', code: 'Votre code', open: 'Ouvrir l\'application', copy: 'Copier le code', copied: 'Code copié ✓', invalid: 'Lien invalide ou incomplet. Redemandez un code depuis l\'application.' },
  en: { title: 'Password reset', hint: 'Open the app to continue. If nothing happens, copy the code and paste it in the app.', code: 'Your code', open: 'Open the app', copy: 'Copy the code', copied: 'Code copied ✓', invalid: 'Invalid or incomplete link. Request a new code from the app.' },
  ar: { title: 'إعادة تعيين كلمة المرور', hint: 'افتح التطبيق للمتابعة. إذا لم يحدث شيء، انسخ الرمز والصقه في التطبيق.', code: 'رمزك', open: 'فتح التطبيق', copy: 'نسخ الرمز', copied: 'تم النسخ ✓', invalid: 'رابط غير صالح أو ناقص. اطلب رمزًا جديدًا من التطبيق.' },
};

function buildScript(scheme: string): string {
  return `
var T=${JSON.stringify(I18N)};
var p=new URLSearchParams(location.hash.slice(1));
var lang=T[p.get('l')]?p.get('l'):'fr',t=T[lang],email=p.get('e')||'',code=p.get('c')||'';
document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
var $=function(id){return document.getElementById(id)};
$('title').textContent=reset?t.title:t.titleE;
if(!/^\\d{6}$/.test(code)||!/^[^\\s@]+@[^\\s@]+$/.test(email)){$('hint').textContent=t.invalid;$('box').style.display='none';}
else{
  var link='${scheme}://forgot-password?email='+encodeURIComponent(email)+'&code='+encodeURIComponent(code);
  $('hint').textContent=t.hint;
  $('label').textContent=t.code;$('code').textContent=code;$('copy').textContent=t.copy;
  $('open').textContent=t.open+(lang==='ar'?' ←':' →');$('open').href=link;
  var done=function(){$('copy').textContent=t.copied};
  var fallback=function(){var r=document.createRange();r.selectNodeContents($('code'));var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy');done()}catch(e){}};
  var doCopy=function(){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(done,fallback)}else{fallback()}};
  $('copy').onclick=doCopy;
  setTimeout(function(){location.href=link},400);
}
`;
}

const PAGE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="light dark"><title>MuscleUP</title>
<style>
:root{--bg:#F4F2F8;--card:#fff;--bd:#E3DEF0;--fg:#1B1530;--mu:#6B6485;--sf:#F5F3FB;--lbl:#6D28D9;--cbd:#D8C8FA;--cfg:#6D28D9}
@media (prefers-color-scheme:dark){:root{--bg:#0B0817;--card:#0F0B1E;--bd:#2E2650;--fg:#F5F2FF;--mu:#A29BC2;--sf:#1A1431;--lbl:#A78BFA;--cbd:#3F3570;--cfg:#C4B5FD}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--fg);display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:24px;overflow:hidden;max-width:440px;width:100%}
.hero{display:block;width:100%;height:auto;background:#6D28D9}
.in{padding:24px 24px 28px;text-align:center}
h1{font-size:21px;font-weight:800;margin:0 0 8px}
p{font-size:14.5px;line-height:1.55;color:var(--mu);margin:0 0 18px}
.box{background:var(--sf);border:1px solid var(--bd);border-radius:18px;padding:16px 12px;margin-bottom:16px}
.lbl{font-size:11.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--lbl);margin-bottom:10px}
.code{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:38px;font-weight:800;letter-spacing:9px;padding-left:9px;color:var(--fg);user-select:all;direction:ltr}
a.btn,button.copy{display:block;width:100%;font:inherit;font-weight:700;font-size:16px;padding:15px;border-radius:14px;text-decoration:none;cursor:pointer;margin-top:10px;text-align:center}
a.btn{background:linear-gradient(180deg,#8B5CF6,#6D28D9);color:#fff !important;border:0;box-shadow:0 6px 18px rgba(124,58,237,.35)}
button.copy{background:transparent;color:var(--cfg);border:1.5px solid var(--cbd)}
</style></head>
<body><div class="card"><img class="hero" src="/*HERO*/" alt="MuscleUP"><div class="in"><h1 id="title"></h1><p id="hint"></p>
<div id="box"><div class="box"><div class="lbl" id="label"></div><div class="code" id="code"></div></div>
<a class="btn" id="open" href="#"></a><button class="copy" id="copy" type="button"></button></div></div></div>
<script>/*SCRIPT*/</script></body></html>`;
