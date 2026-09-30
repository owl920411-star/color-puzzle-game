package com.owl920411.crayonbloom;
/** Pure policy; only eligible active game ticks and genuine finishes reach this class. */
public final class AdCadence {
    private int games;
    private long activeMs;
    public AdCadence(int games, long activeMs) { this.games = Math.max(0, games); this.activeMs = Math.max(0, activeMs); }
    public void tick(int ms) { activeMs = Math.min(86400000L, activeMs + Math.max(0, Math.min(ms, 1000))); }
    public void finish() { games = Math.min(100000, games + 1); }
    public boolean eligible() { return games >= 3 && activeMs >= 600000; }
    public void shown() { games = 0; activeMs = 0; }
    public int games() { return games; }
    public long activeMs() { return activeMs; }
}
