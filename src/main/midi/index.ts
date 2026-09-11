import os from 'os';
import makeDebug from 'debug';

import { ApiMidiRoute } from '../types/api';
import { store } from '../store';

import { MidiRoute, MidiRouteRaw } from './MidiRoute';
import { MidiDeviceManager } from './MidiDeviceManager';
import { MidiInput } from './MidiInput';
import { MidiOutput } from './MidiOutput';
import { MidiOutputDevice } from './MidiOutputDevice';
import { MidiWire } from './MidiWire';

const debug = makeDebug('app:midi');

os.setPriority(19);

export const manager = new MidiDeviceManager();

const REFRESH_LOOP_TIMEOUT = 100;

let loopTimeout: ReturnType<typeof setTimeout> | null = null;

export function getMidiRoutes(): MidiRoute[] {
  return ((store.get('midi.routes') as MidiRouteRaw[]) || []).map((route) =>
    MidiRoute.fromStore(route)
  );
}

export function setMidiRoutes(routes: MidiRoute[]) {
  store.set(
    'midi.routes',
    routes.map((route) => route.toStore())
  );
}

function routeMidi() {
  const routes = getMidiRoutes();

  manager.routeMidi(routes);
}

export function addRoute(apiRoute: ApiMidiRoute) {
  const route = MidiRoute.fromApi(apiRoute);
  debug('Adding route', route);

  const routes = getMidiRoutes();

  const existingRoute = routes.find((r) => r.isSame(route));

  if (!existingRoute) {
    setMidiRoutes([...routes, route]);
    debug('Added route', route);
  }
  routeMidi();
}

export function deleteRoute(apiRoute: ApiMidiRoute) {
  const route = MidiRoute.fromApi(apiRoute);
  const routes = getMidiRoutes();
  setMidiRoutes(routes.filter((r) => !r.isSame(route)));
  debug('Deleted route', route);
  routeMidi();
}

export function clearRoutes() {
  setMidiRoutes([]);
  routeMidi();
}

export function refreshDevices(force = false) {
  const changed = manager.refresh();

  if (changed || force) {
    debug('Devices changed');
    routeMidi();
  }
}

export function startRefreshLoop() {
  refreshDevices();
  loopTimeout = setTimeout(startRefreshLoop, REFRESH_LOOP_TIMEOUT);
}

export function stopRefreshLoop() {
  if (loopTimeout) clearTimeout(loopTimeout);
  loopTimeout = null;
}

export function getInputs() {
  return manager.getInputs().map((i: MidiInput) => i.toApi());
}

export function getOutputs() {
  return manager.getOutputs().map((o: MidiOutput) => o.toApi());
}

export function audition(outputName: string, notes: number[], duration = 600) {
  const output = manager.getOutputs().find((candidate) => candidate.name === outputName);
  const validNotes = [...new Set(notes)].filter(
    (note) => Number.isInteger(note) && note >= 0 && note <= 127
  );

  if (!(output instanceof MidiOutputDevice) || !output.connected || !validNotes.length)
    return false;

  output.open();
  const timestamp = Date.now();
  validNotes.forEach((note) => output.send([0x90, note, 96], timestamp, 'chord-suggester'));
  setTimeout(() => {
    validNotes.forEach((note) => output.send([0x80, note, 0], Date.now(), 'chord-suggester'));
  }, duration);

  return true;
}

export function getWires() {
  return manager.getWires().map((w: MidiWire) => w.toApi());
}
