import { set } from '@ember/object';
import inputComputed from './input-processor-computed';

let deleteFromCommand;
let newCommand;
let newCursorIndex;
let cursorIndexMax;
let newCommandIndex;

export default inputComputed.extend({
    arrowUp() {
        newCommandIndex = this.currCommandIndex + 1;
        if (newCommandIndex > this.commandHistory.length - 1) {
            newCommandIndex = this.commandHistory.length - 1;
        }

        set(this, 'currCommandIndex', newCommandIndex);
        newCommand = this.commandHistory[this.currCommandIndex] || '';
        set(this, 'currentCommand', newCommand);
        set(this, 'cursorPosition', this.currentCommand.length);
    },

    arrowDown() {
        newCommandIndex = this.currCommandIndex - 1;
        if (newCommandIndex < -1) {
            newCommandIndex = -1;
        }

        set(this, 'currCommandIndex', newCommandIndex);
        newCommand = this.commandHistory[this.currCommandIndex] || '';
        set(this, 'currentCommand', newCommand);
        set(this, 'cursorPosition', this.currentCommand.length);
    },

    arrowLeft() {
        newCursorIndex = this.cursorPosition - 1;
        if (newCursorIndex < 0) {
            newCursorIndex = 0;
        }

        set(this, 'cursorPosition', newCursorIndex);
        set(this, 'forceDisplayCursor', true);
    },

    arrowRight() {
        newCursorIndex = this.cursorPosition + 1;
        cursorIndexMax = this.currentCommand.length;
        if (newCursorIndex > cursorIndexMax) {
            newCursorIndex = cursorIndexMax;
        }
        
        set(this, 'cursorPosition', newCursorIndex);
        set(this, 'forceDisplayCursor', true);
    },

    toHome() {
        set(this, 'cursorPosition', 0);
        set(this, 'forceDisplayCursor', true);
    },

    toEnd() {
        set(this, 'cursorPosition', this.currentCommand.length);
        set(this, 'forceDisplayCursor', true);
    },

    delete() {
        // remove char from right
        deleteFromCommand = this.currentCommand.substr(0, this.cursorPosition) +
            this.currentCommand.substr(this.cursorPosition + 1);

        set(this, 'currentCommand', deleteFromCommand);
    },

    backspace() {
        // remove char from left
        newCursorIndex = this.cursorPosition - 1;
        if (newCursorIndex < 0) {
            newCursorIndex = 0;
        }
        
        set(this, 'cursorPosition', newCursorIndex);

        deleteFromCommand = this.currentCommand.substr(0, this.cursorPosition) +
            this.currentCommand.substr(this.cursorPosition + 1);

        set(this, 'currentCommand', deleteFromCommand);
    },

    addKeyToCommand(keyEvent) {
        // add char to command from cursorPosition index
        newCommand = this.currentCommand.substr(0, this.cursorPosition) +
            keyEvent.key +
            this.currentCommand.substr(this.cursorPosition);

        set(this, 'currentCommand', newCommand);
        set(this, 'cursorPosition', this.cursorPosition + 1);
    }
});