// External packages

// Internal packages
import {ICoveoObject} from '../commons/interfaces/ICoveoObject';
import {BaseModel} from './BaseModel';

export class NamedFilter extends BaseModel implements ICoveoObject {
    constructor(id:string) {
        super(id);
    }
}