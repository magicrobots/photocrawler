import { set } from '@ember/object';
import { isPresent } from '@ember/utils';
import { getOwner } from '@ember/application';

import commandRegistry from '../const/command-registry';
import keyFunctions from './input-processor-key-functions';

export default keyFunctions.extend({

    // ------------------- private methods -------------------

    _startPromptCursorLoop() {
        const scope = this;
        set(this, 'cursorLoopContainer', setInterval(function() {
            // check for focus
            if (scope._getIsKeyboardActive()) {
                set(scope, 'isPromptCursorVisible', !scope.isPromptCursorVisible);
                if (scope.isPromptCursorVisible && scope.forceDisplayCursor) {
                    set(scope, 'forceDisplayCursor', false);
                }
            } else {
                set(scope, 'isPromptCursorVisible', false);
            }
        }, 500));
    },

    _getIsKeyboardActive() {
        // const ownerContext = getOwner(this);
        const isViewerActiveDiv = document.activeElement === this.relevantMarkup;
        return isViewerActiveDiv;
    },

    _execute() {
        // store command in history if it's not just whitespace
        const commandWithNoWhitespace = this.currentCommand.replace(/^\s+/, '').replace(/\s+$/, '');
        if (commandWithNoWhitespace !== '') {
            this.commandHistory.unshift(this.currentCommand);
        }

        // kill cursor
        set(this, 'forceDisplayCursor', false);
        set(this, 'isPromptCursorVisible', false);

        // store execution block with empty string array for empty line
        const currBlockCopy = Object.assign([],this.currExecutionBlock);
        const allBlocks = this.previousExecutionBlocks.concat(currBlockCopy).concat(['']);
        set(this, 'previousExecutionBlocks', allBlocks);

        // create executable command from string
        const commandComponents = this.currentCommand.split(' ');
        const appName = commandComponents[0].toUpperCase();
        const args = commandComponents.splice(1);
        set(this, 'currentArgs', args);

        // find command
        const matchedCommand = commandRegistry.getMatchingCommand(appName);

        // execute command if it exists
        if (isPresent(matchedCommand)) {
            this._handleCommandExecution(matchedCommand);
        } else {
            this._handleInvalidInput(appName);
        }
    },

    _handleCommandExecution(commandDefinition) {
        // run app route
        getOwner(this).lookup('router:main').transitionTo(commandDefinition.routeName);
    },

    _handleInvalidInput(appName) {
        set(this, 'currentCommand', '');
        set(this, 'currentArgs', undefined);

        if (isPresent(appName)) {
            set(this, 'appResponse', [`ERROR: ${appName} is not a recognized directive.`]);
            return;
        }

        set(this, 'appResponse', ['enter something']);
    },

    _reset() {
        set(this, 'currentCommand', '');
        set(this, 'currentArgs', undefined);
        set(this, 'cursorPosition', 0);
        getOwner(this).lookup('router:main').transitionTo('index');
    },

    // ------------------- public methods -------------------

    setAppEnvironment(appEnvironment) {
        set(this, 'activeApp', appEnvironment.activeAppName);
        set(this, 'appResponse', appEnvironment.response);
        set(this, 'displayAppNameInPrompt', appEnvironment.displayAppNameInPrompt);
        set(this, 'interruptPrompt', appEnvironment.interruptPrompt);
        this._reset();
    },

    clear() {
        set(this, 'previousExecutionBlocks', []);
        set(this, 'activeApp', undefined);
        set(this, 'appResponse', []);
        this._reset();
    },

    processKey(keyEvent) {
        switch(keyEvent.key.toUpperCase()) {
            case 'F1':
            case 'F2':
            case 'F3':
            case 'F4':
            case 'F5':
            case 'F6':
            case 'F7':
            case 'F8':
            case 'F9':
            case 'F10':
            case 'F11':
            case 'F12':
            case 'SCROLLLOCK':
            case 'PAUSE':
            case 'CAPSLOCK':
            case 'META':
            case 'TAB':
            case 'ESCAPE':
            case 'CONTROL':
            case 'SHIFT':
            case 'ALT': 
            case 'AUDIOVOLUMEUP':
            case 'AUDIOVOLUMEDOWN':
            case 'AUDIOVOLUMEMUTE':
                // ignore the above keystrokes
                break;

            case 'ARROWUP':
                this.arrowUp();
                break;

            case 'ARROWDOWN':
                this.arrowDown();
                break;

            case 'PAGEUP':
            case 'HOME':
                this.toHome();
                break;

            case 'PAGEDOWN':
            case 'END':
                this.toEnd();
                break;

            case 'ARROWLEFT':
                this.arrowLeft();
                break;

            case 'ARROWRIGHT':
                this.arrowRight();
                break;

            case 'DELETE':
                this.delete();                
                break;

            case 'BACKSPACE':
                this.backspace();
                break;

            case 'ENTER':
                this._execute();
                break;

            default:
                this.addKeyToCommand(keyEvent);
                break;
        }
    }
});
