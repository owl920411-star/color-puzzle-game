package com.owl920411.crayonbloom;
import org.junit.Test;
import static org.junit.Assert.*;
public class AdCadenceTest {
 @Test public void fifthGameQualifiesWithoutWaiting() {
  AdCadence c = new AdCadence(0);assertFalse(c.eligible());
  for(int i=1;i<=4;i++){c.finish();assertEquals(i,c.games());assertFalse(c.eligible());}
  c.finish();assertEquals(5,c.games());assertTrue(c.eligible());
 }
 @Test public void onlyActualDisplayResetsCounters() {
  AdCadence c = new AdCadence(5);assertTrue(c.eligible());assertEquals(5,c.games());
  c.shown();assertEquals(0,c.games());assertFalse(c.eligible());
  for(int i=0;i<4;i++){c.finish();assertFalse(c.eligible());}
  c.finish();assertTrue(c.eligible());
 }
 @Test public void twoFinishedGamesThenRestartNeedOnlyThreeMore() {
  AdCadence beforeExit = new AdCadence(0);beforeExit.finish();beforeExit.finish();
  int persistedGames=beforeExit.games();assertEquals(2,persistedGames);
  AdCadence restored = new AdCadence(persistedGames);assertFalse(restored.eligible());
  restored.finish();assertEquals(3,restored.games());assertFalse(restored.eligible());
  restored.finish();assertEquals(4,restored.games());assertFalse(restored.eligible());
  restored.finish();assertEquals(5,restored.games());assertTrue(restored.eligible());
 }
 @Test public void unavailableAdsAndFurtherRestartsKeepAccumulatedGames() {
  AdCadence c = new AdCadence(4);assertFalse(c.eligible());c.finish();assertTrue(c.eligible());
  AdCadence restored = new AdCadence(c.games());assertEquals(5,restored.games());assertTrue(restored.eligible());
  restored.finish();assertEquals(6,restored.games());assertTrue(restored.eligible());
  AdCadence nextLaunch = new AdCadence(restored.games());assertEquals(6,nextLaunch.games());assertTrue(nextLaunch.eligible());
  assertEquals(0,new AdCadence(-1).games());
 }
}
