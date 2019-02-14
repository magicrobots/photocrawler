import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

import environmentHelpers from '../utils/environment-helpers';

export default Route.extend({
    inputProcessor: service(),
    persistenceHandler: service(),
    storyCore: service(),

    doThing() {
        this.inputProcessor.handleFunctionFromApp([`you did a thing.`]);
    },

    afterModel() {
        const appEnvironment = environmentHelpers.generateEnvironmentWithDefaults({
            activeAppName: this.routeName,
            displayAppNameInPrompt: true,
            interruptPrompt: true,
            overrideScope: this,
            response: ['welcome to story.'].concat(this.storyCore.getCurrentRoomDescription())
        });

        this.inputProcessor.setAppEnvironment(appEnvironment);
    }
});
