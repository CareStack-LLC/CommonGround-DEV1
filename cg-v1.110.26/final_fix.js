const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

// Find the start of the final section: "Sync Firm Profile" button area
const targetStart = '<Save className="h-4 w-4 mr-2" />';
const index = content.lastIndexOf(targetStart);

if (index !== -1) {
    // We want to replace from roughly the start of that Button block to the end.
    // Let's find the specific Button start.
    const buttonStart = '<Button\n                          onClick={handleSaveFirm}';
    const bIndex = content.lastIndexOf(buttonStart);

    if (bIndex !== -1) {
        const preamble = content.substring(0, bIndex);
        const newClosing = `                          onClick={handleSaveFirm}
                          disabled={isSavingFirm}
                          className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px] shadow-lg shadow-slate-200"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isSavingFirm ? "Deploying Updates..." : "Sync Firm Profile"}
                        </Button>
                        {firmSaveSuccess && (
                          <span className="text-sm font-semibold text-emerald-600 animate-in fade-in slide-in-from-left-2 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Published to Directory
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-[360px] flex-shrink-0">
            <div className="sticky top-8 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">Live Directory Preview</h3>
                <Badge className="bg-emerald-50 text-emerald-600 border-0 uppercase text-[9px] tracking-widest font-bold">Real-time</Badge>
              </div>

              <div className="space-y-8 bg-slate-100/50 p-6 rounded-3xl border border-dashed border-slate-300">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Mobile Search Result Card</p>
                  <MobileDirectoryCard profile={profile} formData={formData} />
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Firm Page Overview</p>
                  <Card className="p-4 shadow-sm border-slate-200 overflow-hidden relative">
                    <div className="h-2 bg-emerald-600 absolute top-0 left-0 right-0" />
                    <h4 className="font-bold text-sm text-slate-900 group">
                      {firms.find(f => f.id === selectedFirmId)?.name || "Your Firm"}
                      <Globe className="h-3 w-3 inline ml-2 text-slate-300" />
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">{firmFormData.headline || "Headline placeholder..."}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {firmFormData.practice_areas.slice(0, 3).map(a => (
                        <div key={a} className="text-[9px] px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-500">{a}</div>
                      ))}
                    </div>
                  </Card>
                </div>

                <Card className="bg-blue-600 p-4 border-0 shadow-xl shadow-blue-200">
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">CommonGround Verified Profile</p>
                      <p className="text-[10px] opacity-80 mt-1 uppercase tracking-wider font-semibold">Security Level: High</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  The information provided above will be indexed by search engines and visible to all CommonGround users. Review your bio and headline for clarity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
`;
        fs.writeFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', preamble + newClosing);
        console.log("Success");
    } else {
        console.log("Button start not found");
    }
} else {
    console.log("Target start not found");
}
