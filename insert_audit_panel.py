import os

with open("app/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

search_target = """                    )}
                  </motion.div>
                )}
              </div>
              
              {/* ═══════════════ RAG CHAT PANEL (Full Width Grid) ═══════════════ */}"""

audit_panel_jsx = """                    )}

                    {/* 6. Metadata Audit Panel */}
                    <div className="glass-card-elevated rounded-2xl p-6 mt-12 border border-rose-500/10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-rose-400" />
                          <h3 className="font-bold text-sm">Metadata Source Audit</h3>
                        </div>
                        <span className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-400 font-mono tracking-widest uppercase">
                          Developer Access
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-zinc-800/50 text-zinc-500">
                              <th className="pb-3 font-semibold px-2">Video</th>
                              <th className="pb-3 font-semibold px-2">Metric</th>
                              <th className="pb-3 font-semibold px-2">Value</th>
                              <th className="pb-3 font-semibold px-2">Status</th>
                              <th className="pb-3 font-semibold px-2">Source</th>
                              <th className="pb-3 font-semibold px-2">Extraction Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/30 text-zinc-300">
                            {videos.map((video, idx) => {
                              const metrics = [
                                { name: 'Views', value: video.views, formatted: formatNumber(video.views) },
                                { name: 'Likes', value: video.likes, formatted: formatNumber(video.likes) },
                                { name: 'Comments', value: video.comments, formatted: formatNumber(video.comments) },
                                { name: 'Followers', value: video.followerCount, formatted: formatNumber(video.followerCount) },
                                { name: 'Duration', value: video.duration, formatted: formatDuration(video.duration) },
                              ];

                              return metrics.map((m, mIdx) => {
                                const isUnavailable = m.formatted === "Unavailable";
                                return (
                                  <tr key={`${video.id}-${m.name}`} className="hover:bg-zinc-900/30 transition-colors">
                                    <td className="py-2.5 px-2">
                                      {mIdx === 0 && (
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${['bg-violet-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500'][idx % 4]}`} />
                                          <span className="font-medium text-white max-w-[150px] truncate block" title={video.title || ''}>{video.title || `Video ${idx + 1}`}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2 text-zinc-400">{m.name}</td>
                                    <td className={`py-2.5 px-2 font-mono ${isUnavailable ? 'text-zinc-600 italic' : 'text-zinc-200'}`}>{m.formatted}</td>
                                    <td className="py-2.5 px-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${isUnavailable ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                        {isUnavailable ? 'Unavailable' : 'Verified'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-zinc-500">{video.platform} Metadata</td>
                                    <td className="py-2.5 px-2 text-zinc-500 font-mono text-[10px]">{(video as any).extractionMethod || 'API'}</td>
                                  </tr>
                                );
                              });
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* ═══════════════ RAG CHAT PANEL (Full Width Grid) ═══════════════ */}"""

if search_target in content:
    new_content = content.replace(search_target, audit_panel_jsx)
    with open("app/page.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully injected Metadata Audit Panel.")
else:
    print("Could not find the target string to replace. Trying a more relaxed search...")
    # Just insert it before RAG CHAT PANEL (Full Width Grid)
    target = "{/* ═══════════════ RAG CHAT PANEL (Full Width Grid) ═══════════════ */}"
    if target in content:
        new_content = content.replace(target, audit_panel_jsx.replace("                    )}\n                  </motion.div>\n                )}\n              </div>\n              \n              {/* ═══════════════ RAG CHAT PANEL (Full Width Grid) ═══════════════ */}", "                    {/* 6. Metadata Audit Panel */}"))
        with open("app/page.tsx", "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Injected via fallback method.")
    else:
        print("Fallback target not found either.")
