const fs = require('fs');
const file = 'src/components/Settings.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnStart = content.indexOf('  return (\n    <div className="w-full min-h-screen');
const returnEnd = content.lastIndexOf('  );\n}\n');

if (returnStart === -1 || returnEnd === -1) {
  console.error("Could not find return statement");
  process.exit(1);
}

const newReturn = `  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-card border flex items-center justify-center shadow-sm">
              <Settings2 className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your profile, active track configuration, and billing preferences.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onBackToChat} className="shrink-0 rounded-full px-6 bg-card">
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          
          {/* Left Column */}
          <div className="space-y-10">
            
            {/* Account & Profile */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Account & Profile</h2>
              <div className="bg-card rounded-2xl p-6 border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Email Address</Label>
                    <Input 
                      value={user.email || ''} 
                      disabled 
                      className="bg-muted/30 border-none rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Access Tier</Label>
                    <div className="h-11 flex items-center bg-muted/30 rounded-xl px-4 inline-flex w-full">
                      <Badge variant={accessIsPremium ? "default" : "secondary"} className="bg-primary/20 text-primary hover:bg-primary/20 border-none">
                        {accessLabel} Member
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-border my-6" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Study Profile</h3>
                    <p className="text-sm text-muted-foreground">Refine your exam board, target grades, and timeline.</p>
                  </div>
                  <Button onClick={() => setIsEditingStudyProfile(true)} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0">
                    Update Profile
                  </Button>
                </div>
              </div>
            </section>

            {/* Security */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Security</h2>
              <div className="bg-card rounded-2xl p-6 border shadow-sm">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Current Password</Label>
                    <div className="relative">
                      <Input 
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="bg-muted/30 border-none rounded-xl h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1.5 h-8 w-8 p-0"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-semibold">New Password</Label>
                      <div className="relative">
                        <Input 
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="bg-muted/30 border-none rounded-xl h-11 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1.5 h-8 w-8 p-0"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-semibold">Confirm Password</Label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Verify new password"
                          className="bg-muted/30 border-none rounded-xl h-11 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1.5 h-8 w-8 p-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={isChangingPassword}
                      className="rounded-xl px-6 bg-muted/80 text-foreground hover:bg-muted"
                    >
                      {isChangingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Subscription Card */}
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
                     onClick={() => handleManageSubscription()}
                     className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-11 font-semibold"
                   >
                     <Crown className="w-4 h-4 mr-2" />
                     Upgrade to Premium
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
            </div>

            {/* Danger Zone */}
            <div className="space-y-3 mt-8">
              <h2 className="text-sm font-bold text-red-500/80 mb-4 px-1">Danger Zone</h2>
              <div className="rounded-2xl border border-red-500/20 p-4 space-y-4">
                <Button
                  variant="outline"
                  onClick={handleRefreshData}
                  disabled={isDeleting}
                  className="w-full justify-between h-11 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-xl bg-transparent"
                >
                  <span className="font-medium">{isDeleting ? 'Resetting...' : 'Factory Reset Data'}</span>
                  <RefreshCw className={\`h-4 w-4 \${isDeleting ? 'animate-spin' : ''}\`} />
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl font-medium"
                >
                  Log out of session
                </Button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {isEditingStudyProfile && (
        <Suspense fallback={null}>
          <EditOnboardingDetailsModal
            open={isEditingStudyProfile}
            onOpenChange={setIsEditingStudyProfile}
            userId={user?.id}
            initialOnboarding={profile?.onboarding ?? {}}
            track={profile?.track ?? selectedTrack}
            onSaved={fetchProfile}
          />
        </Suspense>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Destructive Action</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all your data including timetables, exam readiness scores, and notes.
              Your account access level will be preserved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDataReset}
              className="bg-red-500 text-white hover:bg-red-600 rounded-xl"
            >
              Yes, delete all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );`;

const newContent = content.substring(0, returnStart) + newReturn + content.substring(returnEnd + 4);
fs.writeFileSync(file, newContent);
console.log("Settings.tsx layout updated");
