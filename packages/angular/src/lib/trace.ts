import { Trace } from '@nativescript/core';

export class NativeScriptDebug {
  static readonly animationsTraceCategory = 'ns-animations';
  static readonly rendererTraceCategory = 'ns-renderer';
  static readonly viewUtilCategory = 'ns-view-util';
  static readonly routerTraceCategory = 'ns-router';
  static readonly routeReuseStrategyTraceCategory = 'ns-route-reuse-strategy';
  static readonly listViewTraceCategory = 'ns-list-view';
  static readonly bootstrapCategory = 'bootstrap';
  // TODO: migrate all usage to this - avoids extraneous method executions
  static readonly enabled = Trace.isEnabled();

  static isLogEnabled() {
    return Trace.isEnabled();
  }

  static animationsLog(message: string): void {
    Trace.write(message, NativeScriptDebug.animationsTraceCategory);
  }

  static rendererLog(msg): void {
    Trace.write(msg, NativeScriptDebug.rendererTraceCategory);
  }

  static rendererError(message: string): void {
    Trace.write(message, NativeScriptDebug.rendererTraceCategory, Trace.messageType.error);
  }

  static viewUtilLog(msg): void {
    Trace.write(msg, NativeScriptDebug.viewUtilCategory);
  }

  static routerLog(message: string): void {
    Trace.write(message, NativeScriptDebug.routerTraceCategory);
  }

  static routerError(message: string): void {
    Trace.write(message, NativeScriptDebug.routerTraceCategory, Trace.messageType.error);
  }

  static routeReuseStrategyLog(message: string): void {
    Trace.write(message, NativeScriptDebug.routeReuseStrategyTraceCategory);
  }

  static styleError(message: string): void {
    Trace.write(message, Trace.categories.Style, Trace.messageType.error);
  }

  static listViewLog(message: string): void {
    Trace.write(message, NativeScriptDebug.listViewTraceCategory);
  }

  static listViewError(message: string): void {
    Trace.write(message, NativeScriptDebug.listViewTraceCategory, Trace.messageType.error);
  }

  static bootstrapLog(message: string): void {
    Trace.write(message, NativeScriptDebug.bootstrapCategory);
  }

  static bootstrapLogError(message: string): void {
    Trace.write(message, NativeScriptDebug.bootstrapCategory, Trace.messageType.error);
  }
}
