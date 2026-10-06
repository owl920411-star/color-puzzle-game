package com.owl920411.crayonbloom;
/** Five genuine normal-game completions per displayed ad; no time threshold. */
public final class AdCadence {
    private int games;
    public AdCadence(int games) { this.games = Math.max(0, games); }
    public void finish() { games = Math.min(100000, games + 1); }
    public boolean eligible() { return games >= 5; }
    public void shown() { games = 0; }
    public int games() { return games; }
}
