import {
	type CompanionStaticUpgradeProps,
	type CompanionStaticUpgradeResult,
	type CompanionUpgradeContext,
	type CompanionStaticUpgradeScript,
} from '@companion-module/base'
import { ActionId } from './actions.js'
import type { EmberPlusConfig } from './config.js'
import { comparitorOptions } from './util'

function v250(
	_context: CompanionUpgradeContext<EmberPlusConfig>,
	props: CompanionStaticUpgradeProps<EmberPlusConfig>,
): CompanionStaticUpgradeResult<EmberPlusConfig> {
	const result: CompanionStaticUpgradeResult<EmberPlusConfig> = {
		updatedActions: [],
		updatedConfig: null,
		updatedFeedbacks: [],
	}

	for (const action of props.actions) {
		switch (action.actionId) {
			case 'setValueBoolean':
			case 'setValueEnum':
			case 'setValueInt':
			case 'setValueReal':
				action.options.useVar = action.options.useVar === undefined ? false : action.options.useVar
				action.options.variable = action.options.variable === undefined ? false : action.options.variable
				result.updatedActions.push(action)
				break
			case 'setValueBooleanVariable':
				action.actionId = ActionId.SetValueBoolean
				action.options.useVar = true
				action.options.valueVar = action.options.value
				action.options.value = false
				action.options.variable = action.options.variable === undefined ? false : action.options.variable
				result.updatedActions.push(action)
				break
			case 'setValueEnumVariable':
				action.actionId = ActionId.SetValueEnum
				action.options.useVar = true
				action.options.valueVar = action.options.value
				action.options.value = 0
				action.options.variable = action.options.variable === undefined ? false : action.options.variable
				result.updatedActions.push(action)
				break
			case 'setValueIntVariable':
				action.actionId = ActionId.SetValueInt
				action.options.useVar = true
				action.options.valueVar = action.options.value
				action.options.value = 0
				action.options.variable = action.options.variable === undefined ? false : action.options.variable
				result.updatedActions.push(action)
				break
			case 'setValueRealVariable':
				action.actionId = ActionId.SetValueReal
				action.options.useVar = true
				action.options.valueVar = action.options.value
				action.options.value = 0
				action.options.variable = action.options.variable === undefined ? false : action.options.variable
				result.updatedActions.push(action)
				break
		}
	}
	for (const feedback of props.feedbacks) {
		switch (feedback.feedbackId) {
			case 'parameter':
				feedback.options.valueVar = feedback.options.valueVar === undefined ? '0' : feedback.options.valueVar
				feedback.options.comparitor =
					feedback.options.comparitor === undefined ? comparitorOptions[0].id : feedback.options.comparitor
				feedback.options.useVar = feedback.options.useVar === undefined ? false : feedback.options.useVar
				feedback.options.asInt = feedback.options.asInt === undefined ? false : feedback.options.asInt
				result.updatedFeedbacks.push(feedback)
		}
	}
	return result
}

export const UpgradeScripts: CompanionStaticUpgradeScript<EmberPlusConfig>[] = [v250]