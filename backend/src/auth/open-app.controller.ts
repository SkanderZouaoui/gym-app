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
  fr: { titleR: 'Réinitialisation du mot de passe', titleE: 'Confirmation de la nouvelle adresse', hintR: 'Ouvrez l\'application pour continuer. Si rien ne se passe, copiez le code et collez-le dans l\'application.', hintE: 'Copiez ce code et collez-le dans l\'application pour confirmer votre nouvelle adresse e-mail.', hintCopy: 'Copiez le code, puis collez-le dans l\'application.', code: 'Votre code', open: 'Ouvrir l\'application', copy: 'Copier le code', copied: 'Code copié ✓', invalid: 'Lien invalide ou incomplet. Redemandez un code depuis l\'application.' },
  en: { titleR: 'Password reset', titleE: 'Confirm your new address', hintR: 'Open the app to continue. If nothing happens, copy the code and paste it in the app.', hintE: 'Copy this code and paste it in the app to confirm your new email address.', hintCopy: 'Copy the code, then paste it in the app.', code: 'Your code', open: 'Open the app', copy: 'Copy the code', copied: 'Code copied ✓', invalid: 'Invalid or incomplete link. Request a new code from the app.' },
  ar: { titleR: 'إعادة تعيين كلمة المرور', titleE: 'تأكيد العنوان الجديد', hintR: 'افتح التطبيق للمتابعة. إذا لم يحدث شيء، انسخ الرمز والصقه في التطبيق.', hintE: 'انسخ هذا الرمز والصقه في التطبيق لتأكيد بريدك الإلكتروني الجديد.', hintCopy: 'انسخ الرمز ثم الصقه في التطبيق.', code: 'رمزك', open: 'فتح التطبيق', copy: 'نسخ الرمز', copied: 'تم النسخ ✓', invalid: 'رابط غير صالح أو ناقص. اطلب رمزًا جديدًا من التطبيق.' },
};

function buildScript(scheme: string): string {
  return `
var T=${JSON.stringify(I18N)};
var p=new URLSearchParams(location.hash.slice(1));
var lang=T[p.get('l')]?p.get('l'):'fr',t=T[lang],email=p.get('e')||'',code=p.get('c')||'';
var reset=p.get('p')!=='e',copyOnly=p.get('a')==='copy';
document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
var $=function(id){return document.getElementById(id)};
$('title').textContent=reset?t.titleR:t.titleE;
if(!/^\\d{6}$/.test(code)||!/^[^\\s@]+@[^\\s@]+$/.test(email)){$('hint').textContent=t.invalid;$('box').style.display='none';}
else{
  var link='${scheme}://forgot-password?email='+encodeURIComponent(email)+'&code='+encodeURIComponent(code);
  $('hint').textContent=!reset?t.hintE:copyOnly?t.hintCopy:t.hintR;
  $('label').textContent=t.code;$('code').textContent=code;$('copy').textContent=t.copy;
  $('ic').title=t.copy;$('ic').setAttribute('aria-label',t.copy);
  if(reset){$('open').textContent=t.open+(lang==='ar'?' ←':' →');$('open').href=link}else{$('open').style.display='none'}
  var done=function(){$('copy').textContent=t.copied;$('ic').classList.add('ok')};
  var fallback=function(){var r=document.createRange();r.selectNodeContents($('code'));var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy');done()}catch(e){}};
  var doCopy=function(){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(done,fallback)}else{fallback()}};
  $('copy').onclick=doCopy;$('ic').onclick=doCopy;
  if(copyOnly)$('copy').classList.add('pulse');
  if(reset&&!copyOnly)setTimeout(function(){location.href=link},400);
}
`;
}

const PAGE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="dark"><title>MuscleUP</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#0B0817;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F5F2FF;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.card{background:#0F0B1E;border:1px solid #2E2650;border-radius:24px;overflow:hidden;max-width:440px;width:100%}
.hero{display:block;width:100%;height:auto;background:#6D28D9}
.in{padding:24px 24px 28px;text-align:center}
h1{font-size:21px;font-weight:800;margin:0 0 8px}
p{font-size:14.5px;line-height:1.55;color:#A29BC2;margin:0 0 18px}
.box{background:#1A1431;border:1px solid #2E2650;border-radius:18px;padding:16px 12px;margin-bottom:16px}
.lbl{font-size:11.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#A78BFA;margin-bottom:10px}
.row{display:flex;align-items:center;justify-content:center;gap:10px;direction:ltr}
.code{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:38px;font-weight:800;letter-spacing:9px;padding-left:9px;color:#fff;user-select:all}
.ic{width:40px;height:40px;border-radius:12px;background:#2E2650;border:1px solid #3F3570;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex:none}
.ic svg{width:22px;height:22px;stroke:#C4B5FD;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ic.ok{background:#14532D;border-color:#22C55E}.ic.ok svg{stroke:#86EFAC}
a.btn,button.copy{display:block;width:100%;font:inherit;font-weight:700;font-size:16px;padding:15px;border-radius:14px;text-decoration:none;cursor:pointer;margin-top:10px;text-align:center}
a.btn{background:linear-gradient(180deg,#8B5CF6,#6D28D9);color:#fff;border:0;box-shadow:0 6px 18px rgba(124,58,237,.35)}
button.copy{background:transparent;color:#C4B5FD;border:1.5px solid #3F3570}
.pulse{border-color:#8B5CF6;color:#fff;background:#1A1431}
</style></head>
<body><div class="card"><img class="hero" src="/*HERO*/" alt="MuscleUP"><div class="in"><h1 id="title"></h1><p id="hint"></p>
<div id="box"><div class="box"><div class="lbl" id="label"></div><div class="row"><div class="code" id="code"></div>
<button class="ic" id="ic" type="button"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg></button></div></div>
<a class="btn" id="open" href="#"></a><button class="copy" id="copy" type="button"></button></div></div></div>
<script>/*SCRIPT*/</script></body></html>`;
