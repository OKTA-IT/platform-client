import { Question } from 'inquirer';
import { Answers } from 'inquirer';
import { RequestResponse } from 'request';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import * as _ from 'underscore';
import { FieldAPI } from '../commons/rest/FieldAPI';
import { Utils } from '../commons/utils/Utils';
import { SourceAPI } from '../commons/rest/SourceAPI';
import { Organization } from '../coveoObjects/Organization';
import { ExtensionAPI } from '../commons/rest/ExtensionAPI';
import { StringUtil } from '../commons/utils/StringUtils';
import { EnvironmentUtils } from '../commons/utils/EnvironmentUtils';
import { PageAPI } from '../commons/rest/PageAPI';

export class InteractiveQuestion {
  static FIELDS_CONTROLLER_NAME: string = 'fields';
  static EXTENSIONS_CONTROLLER_NAME: string = 'extensions';
  static SOURCES_CONTROLLER_NAME: string = 'sources';
  static PAGES_CONTROLLER_NAME: string = 'pages';
  // Required parameters
  static ORIGIN_ORG_ID: string = 'originOrganizationId';
  static MASTER_API_KEY: string = 'APIKey';
  static DESTINATION_ORG_ID: string = 'destinationOrganizationId';
  static COMMAND: string = 'command';
  static ENVIRONMENT: string = 'environment';

  // Options
  static GRADUATE_OPERATIONS: string = 'graduateOperations';
  static OBJECT_TO_MANIPULATE: string = 'objecttToManipulate';
  static SETTING_FILENAME: string = 'settingFilename';
  static LOG_FILENAME: string = 'logFilename';
  static SOURCES: string = 'sources';
  static SOURCES_TO_REBUILD: string = 'sourcesToRebuild';
  static IGNORE_EXTENSIONS: string = 'ignoreExtensions';
  static LOG_LEVEL: string = 'logLevel';
  static KEY_TO_IGNORE: string = 'keyToIgnore';
  static KEY_TO_INCLUDE_ONLY: string = 'keyToIncludeOnly';
  static ADVANCED_MODE: string = 'advancedMode';
  static BASIC_CONFIGURATION_MODE: string = 'Basic';
  static ADVANCED_CONFIGURATION_MODE: string = 'Advanced';
  // static EXECUTE_COMMAND: string = 'executeCommand';

  static GRADUATE_COMMAND: string = 'graduate';
  static DIFF_COMMAND: string = 'diff';
  static DOWNLOAD_COMMAND: string = 'download';
  static UPLOAD_COMMAND: string = 'upload';

  // To answers from previous prompts
  static PREVIOUS_ANSWERS: Answers = {};

  start() {
    const prompt = inquirer.createPromptModule();
    return this.loadFieldModel()
      .then((model: string[]) => {
        return prompt(this.getInitialQuestions({ fieldModel: model })).then((ans: Answers) => {
          InteractiveQuestion.PREVIOUS_ANSWERS = ans;
          const org = new Organization(ans[InteractiveQuestion.ORIGIN_ORG_ID], ans[InteractiveQuestion.MASTER_API_KEY]);

          // Set Node Environment
          EnvironmentUtils.setNodeEnvironment(ans[InteractiveQuestion.ENVIRONMENT]);

          return Promise.all([this.loadSourceList(org), this.loadExtensionList(org), this.loadPageList(org)])
            .then(values => {
              const sources = values[0];
              const extensions = values[1];
              // tslint:disable-next-line: no-magic-numbers
              const pages = values[2];
              return prompt(this.getFinalQuestions({ sources: sources, extensionsToIgnore: extensions, pagesToIgnore: pages }));
            })
            .catch((err: any) => {
              console.error(chalk.red('Unable to load sources or extensions.'), chalk.red(err));
              return prompt(this.getFinalQuestions([]));
            });
        });
      })
      .catch((err: any) => {
        console.error('Unable to load Field model.', chalk.red(err));
        return prompt(this.getInitialQuestions({})).then((ans: Answers) => {
          InteractiveQuestion.PREVIOUS_ANSWERS = ans;
          return prompt(this.getFinalQuestions());
        });
      });
  }

  loadFieldModel(): Promise<string[]> {
    // tslint:disable-next-line:typedef
    return new Promise((resolve, reject) => {
      FieldAPI.getFieldDefinitions()
        .then((resp: RequestResponse) => {
          if (resp.body.definitions && resp.body.definitions.FieldModel && resp.body.definitions.FieldModel.properties) {
            resolve(_.keys(resp.body.definitions.FieldModel.properties));
          } else {
            reject('Unexpected response when trying to load field model');
          }
        })
        .catch((err: any) => {
          reject('Unable to fetch field model');
        });
    });
  }

  loadExtensionList(org: Organization) {
    // tslint:disable-next-line:typedef
    return new Promise((resolve, reject) => {
      ExtensionAPI.getAllExtensions(org)
        .then((resp: RequestResponse) => {
          resolve(_.pluck(resp.body, 'name'));
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  loadPageList(org: Organization) {
    // tslint:disable-next-line:typedef
    return new Promise((resolve, reject) => {
      PageAPI.getAllPages(org)
        .then((resp: RequestResponse) => {
          resolve(_.pluck(resp.body, 'name'));
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  loadSourceList(org: Organization) {
    // tslint:disable-next-line:typedef
    return new Promise((resolve, reject) => {
      SourceAPI.getAllSources(org)
        .then((resp: RequestResponse) => {
          if (resp.body.length > 0) {
            resolve(_.pluck(resp.body, 'name'));
          } else {
            reject('No source available in this organization');
          }
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  getOriginOrganizationId(): Question {
    return {
      type: 'input',
      name: InteractiveQuestion.ORIGIN_ORG_ID,
      message: 'Origin Organization ID: ',
      validate: this.inputValidator('You need to provide the ID of the Organization')
    };
  }

  getDestinationOrganizationId(): Question {
    return {
      type: 'input',
      name: InteractiveQuestion.DESTINATION_ORG_ID,
      message: 'Destination Organization ID: ',
      validate: this.inputValidator('You need to provide the ID of the Organization'),
      when: (answer: Answers) => {
        return [InteractiveQuestion.GRADUATE_COMMAND, InteractiveQuestion.DIFF_COMMAND].indexOf(answer[InteractiveQuestion.COMMAND]) !== -1;
      }
    };
  }

  getApiKey(): Question {
    return {
      type: 'input',
      name: InteractiveQuestion.MASTER_API_KEY,
      message: 'Master API Key: ',
      validate: this.inputValidator('You need to provide an API Key')
    };
  }

  getPlatformEnvironment(): Question {
    return {
      type: 'list',
      name: InteractiveQuestion.ENVIRONMENT,
      message: 'Coveo Cloud platform environment',
      default: 'production',
      choices: [{ name: 'production' }, { name: 'development' }, { name: 'qa' }, { name: 'hipaa' }]
    };
  }

  getCommandList(): Question {
    return {
      type: 'list',
      name: InteractiveQuestion.COMMAND,
      message: 'Command to execute?',
      choices: [
        { name: InteractiveQuestion.DIFF_COMMAND },
        { name: InteractiveQuestion.GRADUATE_COMMAND },
        { name: 'rebuild sources', value: 'rebuild-sources' }
      ]
    };
  }

  setLogLevel(): Question {
    return {
      type: 'list',
      name: InteractiveQuestion.LOG_LEVEL,
      message: 'Log Level',
      default: 'info',
      choices: [{ name: 'nothing' }, { name: 'error' }, { name: 'info' }, { name: 'verbose' }, { name: 'insane' }],
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.ADVANCED_MODE] === InteractiveQuestion.ADVANCED_CONFIGURATION_MODE;
      }
    };
  }

  getContentToDiff(): Question {
    return {
      type: 'list',
      name: InteractiveQuestion.OBJECT_TO_MANIPULATE,
      message: 'What would you like to diff?',
      choices: [
        { name: InteractiveQuestion.FIELDS_CONTROLLER_NAME },
        { name: InteractiveQuestion.EXTENSIONS_CONTROLLER_NAME },
        { name: InteractiveQuestion.SOURCES_CONTROLLER_NAME },
        { name: InteractiveQuestion.PAGES_CONTROLLER_NAME }
      ],
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.COMMAND].indexOf(InteractiveQuestion.DIFF_COMMAND) !== -1;
      }
    };
  }

  getContentToGraduate(): Question {
    return {
      type: 'list',
      name: InteractiveQuestion.OBJECT_TO_MANIPULATE,
      message: 'What would you like to graduate?',
      choices: [
        { name: InteractiveQuestion.FIELDS_CONTROLLER_NAME },
        { name: InteractiveQuestion.EXTENSIONS_CONTROLLER_NAME },
        { name: InteractiveQuestion.SOURCES_CONTROLLER_NAME },
        { name: InteractiveQuestion.PAGES_CONTROLLER_NAME }
      ],
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.COMMAND] === InteractiveQuestion.GRADUATE_COMMAND;
      }
    };
  }

  getSourcesToRebuild(sources: string[]): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.SOURCES_TO_REBUILD,
      message: `Select sources to ${chalk.underline('rebuild')}. You need to select at least one source.`,
      validate: s => {
        return s.length > 0 ? true : 'Select at least one source to rebuild';
      },
      choices: sources,
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.COMMAND] === 'rebuild-sources';
      },
      filter: (input: string) => {
        return `"${input}"`;
      }
    };
  }

  setAdvancedConfiguration(): Question {
    return {
      type: 'list',
      name: InteractiveQuestion.ADVANCED_MODE,
      message: 'Options Configuration',
      default: InteractiveQuestion.BASIC_CONFIGURATION_MODE,
      choices: [{ name: InteractiveQuestion.BASIC_CONFIGURATION_MODE }, { name: InteractiveQuestion.ADVANCED_CONFIGURATION_MODE }]
    };
  }

  setKeysToIgnore(fieldModel: string[]): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.KEY_TO_IGNORE,
      message: `Select the keys that will no be taken in consideration during the diff`,
      choices: fieldModel,
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return (
          answer[InteractiveQuestion.ADVANCED_MODE] === InteractiveQuestion.ADVANCED_CONFIGURATION_MODE &&
          answer[InteractiveQuestion.OBJECT_TO_MANIPULATE] === InteractiveQuestion.FIELDS_CONTROLLER_NAME &&
          fieldModel.length > 0
        );
      }
    };
  }

  setKeysToIncludeOnly(fieldModel: string[]): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.KEY_TO_INCLUDE_ONLY,
      message: `Select the keys that you only want to perform the diff`,
      choices: fieldModel,
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return (
          answer[InteractiveQuestion.ADVANCED_MODE] === InteractiveQuestion.ADVANCED_CONFIGURATION_MODE &&
          answer[InteractiveQuestion.OBJECT_TO_MANIPULATE] === InteractiveQuestion.FIELDS_CONTROLLER_NAME &&
          fieldModel.length > 0
        );
      }
    };
  }

  selectExtensionsToIgnore(extensions: string[]): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.IGNORE_EXTENSIONS,
      message: `Select extensions to ${chalk.bold('ignore')}.`,
      choices: _.map(extensions, (extension: string) => {
        const isAllMetadataValue =
          ['allfieldsvalue', 'allfieldsvalues', 'allmetadatavalue', 'allmetadatavalues'].indexOf(
            StringUtil.lowerAndStripSpaces(extension)
          ) > -1;
        const choice: inquirer.objects.ChoiceOption = {
          name: extension
          // checked: isAllMetadataValue
        };
        if (isAllMetadataValue) {
          choice.disabled = 'Ignored by default';
        }
        return choice;
      }),
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return (
          (answer[InteractiveQuestion.OBJECT_TO_MANIPULATE] === InteractiveQuestion.SOURCES_CONTROLLER_NAME ||
            answer[InteractiveQuestion.OBJECT_TO_MANIPULATE] === InteractiveQuestion.EXTENSIONS_CONTROLLER_NAME) &&
          extensions.length > 0
        );
      },
      filter: (input: string) => {
        return `"${input}"`;
      }
    };
  }

  selectSourcesForFields(sources: string[]): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.SOURCES,
      message: `Select sources from which to load fields. Selecting nothing will load all fields.`,
      choices: sources,
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.OBJECT_TO_MANIPULATE] === InteractiveQuestion.FIELDS_CONTROLLER_NAME && sources.length > 0;
      },
      filter: (input: string) => {
        return `"${input}"`;
      }
    };
  }

  selectSourcesToIgnore(sources: string[]): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.SOURCES,
      message: `Select sources to ${chalk.underline('ignore')}. Selecting nothing will diff all sources`,
      choices: sources,
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.OBJECT_TO_MANIPULATE] === InteractiveQuestion.SOURCES_CONTROLLER_NAME && sources.length > 0;
      },
      filter: (input: string) => {
        return `"${input}"`;
      }
    };
  }

  selectPagesToIgnore(pages: string[]): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.SOURCES,
      message: `Select sources to ${chalk.underline('ignore')}. Selecting nothing will diff all sources`,
      choices: pages,
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.OBJECT_TO_MANIPULATE] === InteractiveQuestion.PAGES_CONTROLLER_NAME && pages.length > 0;
      },
      filter: (input: string) => {
        return `"${input}"`;
      }
    };
  }

  getFileNameForSettings(): Question {
    return this.getGenericFilename(
      InteractiveQuestion.SETTING_FILENAME,
      'command.sh',
      'Enter the filename where the command will be saved: ',
      true
    );
  }

  getFileNameForLogs(): Question {
    return this.getGenericFilename(InteractiveQuestion.LOG_FILENAME, 'logs.json', 'Enter the filename to output logs: ');
  }

  confirmAction(mes: string = 'Are you sure you want to perform this action?', variable: string): Question {
    return {
      type: 'confirm',
      name: variable,
      message: `${chalk.bgRed(mes)}`,
      default: false
    };
  }

  // public executeCommand(): Question {
  //   return {
  //     type: 'confirm',
  //     name: InteractiveQuestion.EXECUTE_COMMAND,
  //     message: 'Would you like to execute the configured command?',
  //     default: false
  //   };
  // }

  getInitialQuestions(data: any): Question[] {
    return [
      this.getPlatformEnvironment(),
      this.getCommandList(),
      this.getOriginOrganizationId(),
      this.getDestinationOrganizationId(),
      this.getApiKey(),

      // If Graduation
      this.getContentToDiff(),
      this.getContentToGraduate(),
      this.getGraduateOperation(),

      // Common Options
      this.setAdvancedConfiguration(),
      this.setKeysToIgnore(data['fieldModel'] || []), // only execute when in advanced option
      this.setKeysToIncludeOnly(data['fieldModel'] || []) // only execute when in advanced option
    ];
  }

  getFinalQuestions(data?: any): Question[] {
    const questions = [];

    if (data && data.sources) {
      questions.push(this.getSourcesToRebuild(data.sources));
      questions.push(this.selectSourcesForFields(data.sources));
      questions.push(this.selectSourcesToIgnore(data.sources));
    }

    if (data && data.extensionsToIgnore) {
      questions.push(this.selectExtensionsToIgnore(data.extensionsToIgnore)); // only execute when in advanced option
    }

    if (data && data.pagesToIgnore) {
      questions.push(this.selectPagesToIgnore(data.pagesToIgnore));
    }

    return _.union(questions, [this.setLogLevel(), this.getFileNameForLogs(), this.getFileNameForSettings()]);
  }

  private getGraduateOperation(): Question {
    return {
      type: 'checkbox',
      name: InteractiveQuestion.GRADUATE_OPERATIONS,
      message: `Select the allowed operations on the destination organization for the graduation:`,
      choices: ['POST', 'PUT', 'DELETE'],
      validate: this.checkboxValidator('You need to select at least 1 graduate operation.'),
      when: (answer: Answers) => {
        answer = _.extend(answer, InteractiveQuestion.PREVIOUS_ANSWERS);
        return answer[InteractiveQuestion.COMMAND] === InteractiveQuestion.GRADUATE_COMMAND;
      }
    };
  }

  private getGenericFilename(nameValue: string, defaultValue: string, messageValue: string, alwaysRun: boolean = false): Question {
    return {
      type: 'input',
      name: nameValue,
      default: defaultValue,
      message: messageValue,
      when: (answer: Answers) => alwaysRun || answer[InteractiveQuestion.ADVANCED_MODE] === InteractiveQuestion.ADVANCED_CONFIGURATION_MODE
    };
  }

  private inputValidator(message: string): (input: string, answers?: Answers) => boolean | string {
    return (input: string) => (Utils.isEmptyString(input) ? message : true);
  }
  private checkboxValidator(message: string): (input: string, answers?: Answers) => boolean | string {
    return (input: string) => (Utils.isEmptyArray(input) ? message : true);
  }
}
