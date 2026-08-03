const fs = require('fs');

const correctEnding = `
<div class="space-y-2">
<label class="text-xs font-bold uppercase tracking-widest text-primary/60 ml-1">Confirm Password</label>
<input class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-secondary transition-all outline-none border border-error/0" placeholder="••••••••" type="password"/>
<!-- Validation Msg Example (Hidden or shown contextually) -->
<p class="hidden text-[10px] text-error font-medium ml-1 mt-1">Passwords do not match.</p>
</div>
</div>
<!-- Instructions / Terms -->
<div class="flex items-start gap-3 bg-surface-container p-4 rounded-lg">
<span class="material-symbols-outlined text-primary-container shrink-0" style="font-size: 20px;">info</span>
<p class="text-xs text-on-primary-fixed-variant leading-relaxed">
                            Registration requires verification. By clicking register, you agree to comply with medical data privacy regulations and internal clinical audit policies.
                        </p>
</div>
<!-- CTA -->
<button class="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all duration-200 mt-4" type="submit">
                        Submit Registration
                    </button>
</form>
<!-- Post-Submission Message (Mockup state) -->
<div class="hidden absolute inset-0 bg-surface-container-lowest/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
<div class="w-20 h-20 bg-tertiary-fixed rounded-full flex items-center justify-center mb-6">
<span class="material-symbols-outlined text-on-tertiary-fixed text-4xl" data-weight="fill">verified</span>
</div>
<h2 class="text-2xl font-bold font-headline text-primary mb-2">Request Submitted</h2>
<p class="text-on-surface-variant max-w-xs mb-8">Your registration request has been sent to the admin for approval. You will receive an email confirmation once verified.</p>
<a class="bg-surface-container-high px-8 py-3 rounded-lg text-primary font-bold hover:bg-surface-container-highest transition-colors" href="../login_page/code.html">Return to Login</a>
</div>
</div>
<!-- Footer-ish prompt -->
<p class="text-center mt-8 text-slate-500 text-sm">
`;

let html = fs.readFileSync('stitch/registration_page/code.html', 'utf8');

// The file currently has:
// <div class="space-y-2">
// <label class="text-xs font-bold uppercase tracking-widest text-primary/60 ml-1">Confirm Password</label>
// </div>
// <!-- Footer-ish prompt -->
// <p class="text-center mt-8 text-slate-500 text-sm">

html = html.replace(
  /<div class="space-y-2">\r?\n<label class="text-xs font-bold uppercase tracking-widest text-primary\/60 ml-1">Confirm Password<\/label>\r?\n<\/div>\r?\n<!-- Footer-ish prompt -->\r?\n<p class="text-center mt-8 text-slate-500 text-sm">/,
  correctEnding.trim()
);

fs.writeFileSync('stitch/registration_page/code.html', html, 'utf8');
console.log('Form restored!');
