@echo off
echo [iMerit] Updating progressEstimator.js...

(
echo const CRIMES_2_0_LAUNCH_TIMESTAMP = 1705881600; 
echo.
echo const LEGACY_CRIME_1_KEYWORDS = [
echo   'grand theft auto', 'gta crime', 'auto theft', 'pickpocket', 'shoplift',
echo   'larceny', 'armed robber', 'kidnap', 'transport drug', 'arms trafficking',
echo   'bombing crime', 'stealth virus', 'warehouse arson', 'search for cash crime',
echo   'sell copied media', 'plant a virus', 'plant a comp', 'pawn shop crime',
echo   'assassinate', 'computer crime', 'murder crime', 'fraud crime', 
echo   'drug deal crime', 'sell illegal', 'theft crime', 'other crime'
echo ];
echo.
echo export function isLegacy(award, signupTimestamp = 0) {
echo   const text = `${award.name  ''} ${award.description  ''}`.toLowerCase();
echo   const isCrimes2Account = signupTimestamp  CRIMES_2_0_LAUNCH_TIMESTAMP;
echo   if (isCrimes2Account) {
echo     return LEGACY_CRIME_1_KEYWORDS.some(kw =^ text.includes(kw)) ^^ 
echo            text.includes('crime experience') ^^ text.includes('jail time');
echo   }
echo   return LEGACY_CRIME_1_KEYWORDS.some(kw =^ text.includes(kw));
echo }
echo.
echo export function estimateProgress(award, personalstats, battlestats, signupTimestamp = 0) {
echo   const isCrimes2Account = signupTimestamp  CRIMES_2_0_LAUNCH_TIMESTAMP;
echo   const desc = (award.description  '').toLowerCase();
echo   const target = extractTarget(desc);
echo   if (!target) return null;
echo   const guesses = [
echo     { kw 'attack',   field 'attackswon' },
echo     { kw 'hospital', field isCrimes2Account  'hospital'  'totalhospital' },
echo     { kw 'revive',   field 'revives' },
echo     { kw 'overdose', field 'overdosed' },
echo     { kw 'jail',     field 'jail' }
echo   ];
echo   for (const g of guesses) {
echo     if (desc.includes(g.kw) ^&^& personalstats[g.field] != null) {
echo       const current = Number(personalstats[g.field]);
echo       const percent = Math.min(100, Math.round((current  target)  100));
echo       return { current, target, percent };
echo     }
echo   }
echo   return null;
echo }
echo.
echo function extractTarget(description = '') {
echo   const m = description.match(([d,]+));
echo   if (!m) return null;
echo   return Number(m[1].replace(,g, ''));
echo }
echo.
echo export function formatNumber(n) { return n.toLocaleString()  '0'; }
echo.
echo export function asciiBar(percent, width = 10) {
echo   const filled = Math.round((percent  100)  width);
echo   return '[' + '#'.repeat(filled) + '-'.repeat(width - filled) + ']';
echo }
)  utilsprogressEstimator.js

echo [iMerit] Updating NextClosest.jsx...

(
echo import { useMemo } from 'react';
echo import { estimateProgress, isLegacy } from '..utilsprogressEstimator';
echo.
echo const HEADER = `--- NEXT 5 CLOSEST ---------------------`;
echo.
echo export function NextClosest({ awards, playerData, topN = 5 }) {
echo   const { personalstats, battlestats, profile } = playerData;
echo   const signupTs = profile.signup_timestamp  0;
echo   const ranked = useMemo(() =^ {
echo     return awards
echo       .filter(a =^ !a.earned ^&^& !isLegacy(a, signupTs))
echo       .map(a =^ ({ award a, progress estimateProgress(a, personalstats, battlestats, signupTs) }))
echo       .filter(x =^ x.progress ^&^& x.progress.percent ^ 0 ^&^& x.progress.percent ^ 100)
echo       .sort((a, b) =^ b.progress.percent - a.progress.percent)
echo       .slice(0, topN);
echo   }, [awards, personalstats, battlestats, signupTs, topN]);
echo   if (ranked.length === 0) return null;
echo   return (
echo     ^div className=font-mono text-green-400 bg-black p-3 border border-green-900 mb-4 smborder-x-0^
echo       ^div className=mb-2 text-xs opacity-70 whitespace-pre^{HEADER}^div^
echo       ^div className=space-y-1^
echo         {ranked.map(({ award, progress }, i) =^ (
echo           ^div key={award.id} className=flex justify-between text-[11px] hoverbg-green-90010^^
echo             ^span^{i + 1}. {award.name.slice(0, 15).padEnd(16, '.')}^span^
echo             ^span className=text-green-200^[{progress.percent}%%]^span^
echo           ^div^
echo         ))}
echo       ^div^
echo     ^div^
echo   );
echo }
)  srccomponentsNextClosest.jsx

echo [iMerit] Deploying to GitHub Master...
git add .
git commit -m Fix Crimes 2.0 gate and mobile ASCII
git push origin master

echo [DONE] Refresh your browser in 60 seconds.
pause