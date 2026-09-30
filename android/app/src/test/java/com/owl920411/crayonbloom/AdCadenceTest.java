package com.owl920411.crayonbloom;
import org.junit.Test;
import static org.junit.Assert.*;
public class AdCadenceTest {
 @Test public void secondGameQualifiesWithoutWaiting() {
  AdCadence c = new AdCadence(0);assertFalse(c.eligible());
  c.finish();assertFalse(c.eligible());c.finish();assertTrue(c.eligible());
 }
 @Test public void onlyActualDisplayResetsCounters() {
  AdCadence c = new AdCadence(2);assertTrue(c.eligible());assertEquals(2,c.games());
  c.shown();assertEquals(0,c.games());assertFalse(c.eligible());
  c.finish();assertFalse(c.eligible());c.finish();assertTrue(c.eligible());
 }
 @Test public void countersSurviveRestartAndUnavailableAds() {
  AdCadence c = new AdCadence(1);assertFalse(c.eligible());c.finish();assertTrue(c.eligible());
  AdCadence restored = new AdCadence(c.games());assertTrue(restored.eligible());
  restored.finish();assertTrue(restored.eligible());assertEquals(3,restored.games());
  assertEquals(0,new AdCadence(-1).games());
 }
}
