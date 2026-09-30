package com.owl920411.crayonbloom;
import org.junit.Test;
import static org.junit.Assert.*;
public class AdCadenceTest {
 @Test public void bothThresholdsAreRequired() {
  AdCadence c = new AdCadence(2, 600000); assertFalse(c.eligible()); c.finish(); assertTrue(c.eligible());
  c = new AdCadence(3, 599999); assertFalse(c.eligible()); c.tick(1); assertTrue(c.eligible());
 }
 @Test public void onlyActualImpressionResetsCounters() {
  AdCadence c = new AdCadence(3, 600000); assertTrue(c.eligible()); assertEquals(3,c.games());
  c.shown(); assertEquals(0,c.games()); assertEquals(0,c.activeMs()); assertFalse(c.eligible());
 }
 @Test public void persistedCountersAndInputBounds() {
  AdCadence c = new AdCadence(-1,-1);c.tick(-20);assertEquals(0,c.activeMs());c.tick(900000);assertEquals(1000,c.activeMs());
  c = new AdCadence(7,1200000);assertTrue(c.eligible());
 }
}
