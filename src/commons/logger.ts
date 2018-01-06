import * as _ from 'underscore';
import { Utils } from './utils/Utils';
import { Assert } from './misc/Assert';
import { FileUtils } from './utils/FileUtils';
import * as Ora from 'ora';

/**
 * The LoggerSingleton which is a Singleton class.
 *
 * @export
 * @class LoggerSingleton
 */
class LoggerSingleton {

  private static logger: LoggerSingleton = new LoggerSingleton();

  static INSANE: number = 1;
  static VERBOSE: number = 2;
  static INFO: number = 3;
  static ERROR: number = 4;
  static NOTHING: number = 5;

  static getInstance(): LoggerSingleton {
    return this.logger;
  }

  // tslint:disable-next-line:typedef
  private spinner = Ora();
  private level: number = LoggerSingleton.INFO;
  private filename: string = 'coveo-cli.log';

  public newAction(actionName: string) {
    let actionTime = new Date();
    let data = `\n\n#######################################\n${actionName}\n${actionTime}\n#######################################\n`;
    FileUtils.appendToFile(this.filename, data)
      .then(() => {
      })
      .catch((err: any) => {
        console.error('Unable to save log');
      });
  }

  public startSpinner(initialMessage?: string) {
    this.spinner.start(initialMessage || '');
  }

  public stopSpinner() {
    this.spinner.stop();
  }

  public loadingTask(message: string) {
    this.spinner.text = message;
  }

  public info(message: string, ...meta: any[]) {
    if (this.level <= LoggerSingleton.INFO) {
      this.log('INFO', 'succeed', message, meta);
    }
    this.addToLogFile('INFO', message, meta);
  }

  public warn(message: string, ...meta: any[]) {
    if (this.level <= LoggerSingleton.INFO) {
      this.log('WARN', 'warn', message, meta);
    }
    this.addToLogFile('WARN', message, meta);
  }

  public error(message: string, ...meta: any[]) {
    if (this.level <= LoggerSingleton.ERROR) {
      this.log('ERROR', 'fail', message, meta);
    }
    this.addToLogFile('ERROR', message, meta);
  }

  public verbose(message: string, ...meta: any[]) {
    if (this.level <= LoggerSingleton.VERBOSE) {
      this.log('VERBOSE', 'info', message, meta);
    }
    this.addToLogFile('VERBOSE', message, meta);
  }

  public insane(message: string, ...meta: any[]) {
    if (this.level <= LoggerSingleton.INSANE) {
      this.log('INSANE', 'succeed', message, meta);
    }
    this.addToLogFile('INSANE', message, meta);
  }

  public addToLogFile(level: string, message: string, ...meta: any[]) {
    let today = (new Date()).toLocaleString();
    FileUtils.appendToFile(this.filename, [today, level, message, '\n'].join(' | '));
    _.each(meta, (m: any) => {
      if (!Utils.isEmptyString(m.toString())) {
        FileUtils.appendToFile(this.filename, [today, level, m.toString(), '\n'].join(' | '));
      }
    });
  }

  public log(level: string, logAction: 'succeed' | 'warn' | 'fail' | 'info', message: string, ...meta: any[]) {
    let fullMessage: string = '';
    _.each(meta, (m: any) => {
      if (!Utils.isEmptyString(m.toString())) {
        fullMessage += `\n${m.toString()}`;
      }
    });

    this.spinner[logAction](message + fullMessage);

    this.startSpinner();
    // this.spinner.color = color;
  }

  public setLogLevel(level: string) {
    switch (level.toLowerCase()) {
      case 'info':
        this.level = LoggerSingleton.INFO;
        break;
      case 'error':
        this.level = LoggerSingleton.ERROR;
        break;
      case 'verbose':
        this.level = LoggerSingleton.VERBOSE;
        break;
      case 'insane':
        this.level = LoggerSingleton.INSANE;
        break;
      case 'nothing':
        this.level = LoggerSingleton.NOTHING;
        break;
      default:
        this.level = LoggerSingleton.INFO;
        break;
    }
  }

  public setFilename(filename: string) {
    Assert.isNotUndefined(filename);
    this.filename = filename.toString();
  }

  public getFilename(): string {
    return this.filename;
  }

  public enable() {
    this.level = LoggerSingleton.INFO;
  }

  public disable() {
    this.level = LoggerSingleton.NOTHING;
  }
}

export let Logger = LoggerSingleton.getInstance();
