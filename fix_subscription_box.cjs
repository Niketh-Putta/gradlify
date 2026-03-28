const fs = require('fs');
const file = 'src/components/Settings.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block to replace is the right column Subscription Card
const oldBlock = `            {/* Subscription Card */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-32 bg-primary/10 blur-3xl rounded-full translate-x-12 -translate-y-12 pointer-events-none" />
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-8">
                   <Crown className="h-5 w-5 text-primary" />
                   <h3 className="font-bold text-lg">Subscription</h3>
                 </div>
                 
                 <div className="flex items-center justify-between mb-8">
                   <span className="text-sm text-slate-400">Current Plan</span>
                   <span className="text-sm font-semibold text-primary">{accessLabel} Tier</span>
                 </div>

                 {!hasPremiumSubscription ? (
                   <Button 
                     onClick={() => handleUpgradeToPremium('monthly')}
                     className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-11 font-semibold"
                     disabled={isCreatingCheckout}
                   >
                     <Crown className="w-4 h-4 mr-2" />
                     {isCreatingCheckout ? "Loading..." : "Upgrade to Premium"}
                   </Button>
                 ) : (
                   <Button 
                     onClick={handleManageSubscription}
                     className="w-full bg-slate-800 text-white hover:bg-slate-700 rounded-xl h-11 font-medium border border-slate-700"
                   >
                     Manage Subscription
                   </Button>
                 )}
               </div>
            </div>`;

const newBlock = `            {/* Subscription Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subscription</h2>
                <Badge variant={accessIsPremium ? "default" : "secondary"} className="bg-primary/20 text-primary border-none text-[10px] h-5 px-2">
                  {accessLabel}
                </Badge>
              </div>

              {!hasPremiumSubscription ? (
                <div className="space-y-4">
                  {/* Premium Plan Box */}
                  <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <Crown className="h-4 w-4 text-primary" /> Premium 
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">Foundational mastery and readiness tools.</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">£19.99</span>
                          <span className="text-[10px] text-slate-400 block">/month</span>
                        </div>
                      </div>
                      
                      <ul className="space-y-2 mb-6 text-xs text-slate-300">
                        <li className="flex gap-2 items-center"><Shield className="h-3 w-3 text-primary" /> Full exam board alignment</li>
                        <li className="flex gap-2 items-center"><Shield className="h-3 w-3 text-primary" /> Infinite mock questions</li>
                        <li className="flex gap-2 items-center"><Shield className="h-3 w-3 text-primary" /> Standard readiness tracking</li>
                      </ul>

                      <Button 
                        onClick={() => handleUpgradeToPremium('monthly')}
                        disabled={isCreatingCheckout}
                        className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-10 text-sm font-semibold transition-all"
                      >
                        {isCreatingCheckout ? "Loading..." : "Get Premium"}
                      </Button>
                    </div>
                  </div>

                  {/* Ultra Plan Box */}
                  <div className="bg-gradient-to-br from-indigo-950/90 to-slate-900 rounded-2xl p-5 border border-indigo-500/30 shadow-xl text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-indigo-300 flex items-center gap-2">
                            <Code className="h-4 w-4" /> Ultra
                          </h3>
                          <p className="text-xs text-slate-300 mt-1">Ultimate preparation and insight.</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-indigo-300">£149.99</span>
                          <span className="text-[10px] text-indigo-300/60 block">/year</span>
                        </div>
                      </div>
                      
                      <ul className="space-y-2 mb-6 text-xs text-slate-200">
                        <li className="flex gap-2 items-center"><Crown className="h-3 w-3 text-indigo-400" /> All Premium Features</li>
                        <li className="flex gap-2 items-center"><Crown className="h-3 w-3 text-indigo-400" /> Deep AI performance analytics</li>
                        <li className="flex gap-2 items-center"><Crown className="h-3 w-3 text-indigo-400" /> Ultimate Mock Paper access</li>
                      </ul>

                      <Button 
                        onClick={() => handleUpgradeToPremium('ultra')}
                        disabled={isCreatingCheckout}
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl h-10 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border-none"
                      >
                        {isCreatingCheckout ? "Loading..." : "Get Ultra"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-32 bg-primary/10 blur-3xl rounded-full translate-x-12 -translate-y-12 pointer-events-none" />
                   <div className="relative z-10 space-y-4">
                     <div>
                       <h3 className="font-bold mb-1">Active Subscription</h3>
                       <p className="text-sm text-slate-400">You are currently on the {accessLabel} tier.</p>
                     </div>
                     <Button 
                       onClick={handleManageSubscription}
                       className="w-full bg-slate-800 text-white hover:bg-slate-700 rounded-xl h-11 font-medium border border-slate-700 mt-4"
                     >
                       Manage Billing
                     </Button>
                   </div>
                </div>
              )}
            </div>`;

if (!content.includes('            {/* Subscription Card */}')) {
  console.error("Could not find subscription card");
  process.exit(1);
}

const finalContent = content.replace(oldBlock, newBlock);
fs.writeFileSync(file, finalContent);
console.log("Subscription box updated successfully");
