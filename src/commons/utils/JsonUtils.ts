// External packages
import { flatten } from 'flat';
// Internal packages
import { Dictionary } from '../collections/Dictionary';

export class JsonUtils {
  static flatten(jsonObject: any): any {
    return flatten(jsonObject);
  }

  static removeFieldsFromJson(json: any, fieldsToIgnore?: string[]): any {
    let ignoreList = fieldsToIgnore || new Array<string>();

    Object.keys(json).forEach((key: string) => {
      if (ignoreList.indexOf(key) > -1) {
        delete json[key];
      }
    });

    return json;
  }

  static recurivelyRemoveFieldsFromJson(items: Dictionary<any>, fieldsToIgnore?: string[]): Dictionary<any> {
    let ignoreList = fieldsToIgnore || new Array<string>();
    items.Keys().forEach((key: string) => {
      ignoreList.forEach((field: string) => {
        if (key.indexOf('.' + field + '.') > -1 || key.lastIndexOf('.' + field, key.length - (field.length + 1)) === key.length - (field.length + 1)) {
          items.Remove(key);
        }
      });
    });

    return items;
  }

  static convertJsonToDictionary(json: any, fieldsToIgnore?: string[]): Dictionary<any> {
    let ignoreList = fieldsToIgnore || new Array<string>();
    let newDictionary: Dictionary<any> = new Dictionary<any>();

    Object.keys(json).forEach((key: string) => {
      if (ignoreList.indexOf(key) === -1) {
        newDictionary.Add(key, json[key]);
      }
    });

    return newDictionary;
  }
}
