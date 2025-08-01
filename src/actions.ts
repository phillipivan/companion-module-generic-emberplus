import type {
	CompanionActionDefinition,
	CompanionActionDefinitions,
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldTextInput,
	CompanionInputFieldCheckbox,
	CompanionOptionValues,
} from '@companion-module/base'
import { EmberClient, Model as EmberModel } from 'emberplus-connection'
import type PQueue from 'p-queue'
import type { EmberPlusConfig } from './config'
import type { EmberPlusInstance } from './index'
import { doMatrixAction, doTake, doClear, setSelectedSource, setSelectedTarget } from './actions/matrix'
import { learnSetValueActionOptions, setValue, subscribeParameterAction } from './actions/parameter'
import { EmberPlusState } from './state'
import { filterPathChoices } from './util'

export interface setValueActionOptions extends CompanionOptionValues {
	path: string
	pathVar: string
	usePathVar: boolean
	value: string | number | boolean
	useVar?: boolean
	variable: boolean
	valueVar?: string
	relative?: boolean
	min?: string
	max?: string
	factor?: string
	toggle?: boolean
	parseEscapeChars?: boolean
	asEnum?: boolean
	enumValue?: string
}

export enum ActionId {
	SetValueInt = 'setValueInt',
	SetValueReal = 'setValueReal',
	SetValueString = 'setValueString',
	SetValueBoolean = 'setValueBoolean',
	SetValueEnum = 'setValueEnum',
	MatrixConnect = 'matrixConnect',
	MatrixDisconnect = 'matrixDisconnect',
	MatrixSetConnection = 'matrixSetConnection',
	Take = 'take',
	Clear = 'clear',
	SetSelectedSource = 'setSelectedSource',
	SetSelectedTarget = 'setSelectedTarget',
}

const pathDropDown: CompanionInputFieldDropdown = {
	type: 'dropdown',
	label: 'Select registered path',
	id: 'path',
	choices: [],
	default: 'No paths configured!',
	allowCustom: true,
	isVisibleExpression: '!$(options:usePathVar)',
}

const pathString: CompanionInputFieldTextInput = {
	type: 'textinput',
	label: 'Path',
	id: 'pathVar',
	required: true,
	useVariables: { local: true },
	default: '',
	tooltip: `Path may be supplied in decimals: 1.2.3, text: path.to.ember.element, or with a descriptor and the decimals wrapped in brackets: path to ember element[1.2.3.4]`,
	isVisibleExpression: '!!$(options:usePathVar)',
}
const usePathVar: CompanionInputFieldCheckbox = {
	type: 'checkbox',
	label: 'Path from String',
	id: 'usePathVar',
	default: false,
}

const pathInput: CompanionInputFieldTextInput = {
	type: 'textinput',
	label: 'Path',
	id: 'path',
	useVariables: { local: true },
	tooltip: `Path may be supplied in decimals: 1.2.3, text: path.to.ember.element, or with a descriptor and the decimals wrapped in brackets: path to ember element[1.2.3.4]`,
}

const minLimit: CompanionInputFieldTextInput = {
	type: 'textinput',
	label: 'Minimum',
	id: 'min',
	default: '-4294967295',
	useVariables: { local: true },
	tooltip: 'Relative action minimum value will be limited to this value',
	isVisibleExpression: '!!$(options:relative)',
}

const maxLimit: CompanionInputFieldTextInput = {
	type: 'textinput',
	label: 'Maximum',
	id: 'max',
	default: '4294967295',
	useVariables: { local: true },
	tooltip: 'Relative action maximum value will be limited to this value',
	isVisibleExpression: '!!$(options:relative)',
}

const relative: CompanionInputFieldCheckbox = {
	type: 'checkbox',
	label: 'Relative',
	id: 'relative',
	default: false,
	tooltip: 'Adjust value by this amount. Variable will be auto-created.',
}

const createVariable: CompanionInputFieldCheckbox = {
	type: 'checkbox',
	label: 'Auto Create Variable',
	id: 'variable',
	default: false,
}

const useVariable: CompanionInputFieldCheckbox = {
	type: 'checkbox',
	label: 'Use Variable?',
	id: 'useVar',
	default: false,
}

const factorOpt: CompanionInputFieldTextInput = {
	type: 'textinput',
	label: 'Factor',
	id: 'factor',
	useVariables: { local: true },
	default: '1',
	tooltip: `Value will be multiplied by this field`,
}

const asEnum: CompanionInputFieldCheckbox = {
	type: 'checkbox',
	label: 'Set from Enumeration Value?',
	id: 'asEnum',
	default: false,
}

const enumVal: CompanionInputFieldTextInput = {
	type: 'textinput',
	label: 'Enumeration',
	id: 'enumValue',
	required: true,
	useVariables: { local: true },
	default: '',
	tooltip: 'Must exactly match a valid enumaeration value',
	isVisibleExpression: '!!$(options:asEnum)',
}

const matrixInputs: Array<CompanionInputFieldTextInput | CompanionInputFieldNumber | CompanionInputFieldCheckbox> = [
	pathInput,
	{
		type: 'number',
		label: 'Target',
		id: 'target',
		required: true,
		min: 0,
		max: 0xffffffff,
		default: 0,
		step: 1,
		isVisibleExpression: '!$(options:useVar)',
	},
	{
		type: 'textinput',
		label: 'Target',
		id: 'targetVar',
		regex: '',
		useVariables: { local: true },
		default: '0',
		isVisibleExpression: '!!$(options:useVar)',
	},
	{
		type: 'textinput',
		label: 'Sources',
		id: 'sources',
		regex: '/^((\\s*\\d+,)*(\\s*\\d+)$)|$/', // comma separated list
		useVariables: { local: true },
	},
	{
		type: 'checkbox',
		label: 'Use Variable?',
		id: 'useVar',
		default: false,
	},
]

export function GetActionsList(
	self: EmberPlusInstance,
	emberClient: EmberClient,
	config: EmberPlusConfig,
	state: EmberPlusState,
	queue: PQueue,
): CompanionActionDefinitions {
	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		[ActionId.SetValueInt]: {
			name: 'Set Value Integer',
			options: [
				{
					...pathDropDown,
					choices: filterPathChoices(state, true, EmberModel.ParameterType.Integer),
					default:
						filterPathChoices(state, true, EmberModel.ParameterType.Integer).find(() => true)?.id ??
						'No paths configured!',
				},
				pathString,
				usePathVar,
				{
					type: 'number',
					label: 'Value',
					id: 'value',
					required: true,
					min: -0xffffffff,
					max: 0xffffffff,
					default: 0,
					step: 1,
					isVisibleExpression: '!$(options:useVar)',
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'valueVar',
					required: true,
					useVariables: { local: true },
					default: '0',
					isVisibleExpression: '!!$(options:useVar)',
				},
				useVariable,
				relative,
				{
					...minLimit,
					tooltip: 'Relative action maximum value will be limited to this value. Value is not factored',
				},
				{
					...maxLimit,
					tooltip: 'Relative action maximum value will be limited to this value. Value is not factored',
				},
				factorOpt,
				{
					...createVariable,
					isVisibleExpression: '!$(options:relative)',
				},
			],
			callback: setValue(self, emberClient, EmberModel.ParameterType.Integer, ActionId.SetValueInt, state, queue),
			subscribe: subscribeParameterAction(self),
			learn: learnSetValueActionOptions(state, EmberModel.ParameterType.Integer, ActionId.SetValueInt),
		},
		[ActionId.SetValueReal]: {
			name: 'Set Value Real',
			options: [
				{
					...pathDropDown,
					choices: filterPathChoices(state, true, EmberModel.ParameterType.Real),
					default:
						filterPathChoices(state, true, EmberModel.ParameterType.Real).find(() => true)?.id ??
						'No paths configured!',
				},
				pathString,
				usePathVar,
				{
					type: 'number',
					label: 'Value',
					id: 'value',
					required: true,
					min: -0xffffffff,
					max: 0xffffffff,
					default: 0,
					step: 0.001, // TODO - don't want this at all preferably
					isVisibleExpression: '!$(options:useVar)',
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'valueVar',
					default: '0.0',
					useVariables: { local: true },
					isVisibleExpression: '!!$(options:useVar)',
				},
				useVariable,
				relative,
				minLimit,
				maxLimit,
				{
					...createVariable,
					isVisibleExpression: '!$(options:relative)',
				},
			],
			callback: setValue(self, emberClient, EmberModel.ParameterType.Real, ActionId.SetValueReal, state, queue),
			subscribe: subscribeParameterAction(self),
			learn: learnSetValueActionOptions(state, EmberModel.ParameterType.Real, ActionId.SetValueReal),
		},
		[ActionId.SetValueBoolean]: {
			name: 'Set Value Boolean',
			options: [
				{
					...pathDropDown,
					choices: filterPathChoices(state, true, EmberModel.ParameterType.Boolean),
					default:
						filterPathChoices(state, true, EmberModel.ParameterType.Boolean).find(() => true)?.id ??
						'No paths configured!',
				},
				pathString,
				usePathVar,
				{
					type: 'checkbox',
					label: 'Toggle',
					id: 'toggle',
					default: false,
					tooltip: 'Variable will be auto-created.',
				},
				{
					type: 'checkbox',
					label: 'Value',
					id: 'value',
					default: false,
					isVisibleExpression: '!$(options:useVar) && !$(options:toggle)',
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'valueVar',
					default: 'false',
					useVariables: { local: true },
					isVisibleExpression: '!!$(options:useVar) && !$(options:toggle)',
				},
				{
					...useVariable,
					isVisibleExpression: '!$(options:toggle)',
				},
				{
					...createVariable,
					isVisibleExpression: '!$(options:toggle)',
				},
			],
			callback: setValue(self, emberClient, EmberModel.ParameterType.Boolean, ActionId.SetValueBoolean, state, queue),
			subscribe: subscribeParameterAction(self),
			learn: learnSetValueActionOptions(state, EmberModel.ParameterType.Boolean, ActionId.SetValueBoolean),
		},
		[ActionId.SetValueEnum]: {
			name: 'Set Value ENUM',
			options: [
				{
					...pathDropDown,
					choices: filterPathChoices(state, true, EmberModel.ParameterType.Enum),
					default:
						filterPathChoices(state, true, EmberModel.ParameterType.Enum).find(() => true)?.id ??
						'No paths configured!',
				},
				pathString,
				usePathVar,
				{
					type: 'number',
					label: 'Value',
					id: 'value',
					required: true,
					min: 0x00000000,
					max: 0xffffffff,
					default: 0,
					step: 1,
					isVisible: (options) => {
						return !options.useVar && !options.asEnum
					},
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'valueVar',
					required: true,
					useVariables: { local: true },
					default: '0',
					tooltip: 'Return an integer between 0 and 4294967295',
					isVisibleExpression: '!!$(options:useVar) && !$(options:asEnum)',
				},
				enumVal,
				asEnum,
				{
					...useVariable,
					isVisibleExpression: '!$(options:asEnum)',
				},
				{
					...relative,
					isVisibleExpression: '!$(options:asEnum)',
				},
				{
					...minLimit,
					default: '0',
					isVisibleExpression: '!$(options:asEnum) && !!$(options:relative)',
				},
				{
					...maxLimit,
					isVisibleExpression: '!$(options:asEnum) && !!$(options:relative)',
				},
				{
					...createVariable,
					isVisibleExpression: '!$(options:asEnum) && !$(options:relative)',
				},
			],
			callback: setValue(self, emberClient, EmberModel.ParameterType.Enum, ActionId.SetValueEnum, state, queue),
			subscribe: subscribeParameterAction(self),
			learn: learnSetValueActionOptions(state, EmberModel.ParameterType.Enum, ActionId.SetValueEnum),
		},
		[ActionId.SetValueString]: {
			name: 'Set Value String',
			options: [
				{
					...pathDropDown,
					choices: filterPathChoices(state, true, EmberModel.ParameterType.String),
					default:
						filterPathChoices(state, true, EmberModel.ParameterType.String).find(() => true)?.id ??
						'No paths configured!',
				},
				pathString,
				usePathVar,
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					useVariables: { local: true },
				},
				{
					type: 'checkbox',
					label: 'Parse escape characters',
					id: 'parseEscapeChars',
					default: true,
					tooltip: 'Parse escape characters such as \\r \\n \\t',
				},
				createVariable,
			],
			callback: setValue(self, emberClient, EmberModel.ParameterType.String, ActionId.SetValueString, state, queue),
			subscribe: subscribeParameterAction(self),
			learn: learnSetValueActionOptions(state, EmberModel.ParameterType.String, ActionId.SetValueString),
		},
		[ActionId.MatrixConnect]: {
			name: 'Matrix Connect',
			options: [...matrixInputs],
			callback: doMatrixAction(self, emberClient, async (...args) => emberClient.matrixConnect(...args), queue),
		},
		[ActionId.MatrixDisconnect]: {
			name: 'Matrix Disconnect',
			options: [...matrixInputs],
			callback: doMatrixAction(self, emberClient, async (...args) => emberClient.matrixDisconnect(...args), queue),
		},
		[ActionId.MatrixSetConnection]: {
			name: 'Matrix Set Connection',
			options: [...matrixInputs],
			callback: doMatrixAction(self, emberClient, async (...args) => emberClient.matrixSetConnection(...args), queue),
		},
		[ActionId.Take]: {
			name: 'Take',
			options: [],
			callback: doTake(self, emberClient, config, state, queue),
		},
		[ActionId.Clear]: {
			name: 'Clear',
			options: [],
			callback: doClear(self, state),
		},
		[ActionId.SetSelectedSource]: {
			name: 'Set Selected Source',
			options: [
				{
					type: 'number',
					label: 'Select Matrix Number',
					id: 'matrix',
					required: true,
					min: -0,
					max: 0xffffffff,
					default: 0,
					isVisibleExpression: '!$(options:useVar)',
				},
				{
					type: 'textinput',
					label: 'Select Matrix Number',
					id: 'matrixVar',
					regex: '',
					useVariables: { local: true },
					default: '0',
					isVisibleExpression: '!!$(options:useVar)',
				},
				{
					type: 'number',
					label: 'Value',
					id: 'source',
					required: true,
					min: -0,
					max: 0xffffffff,
					default: 0,
					isVisibleExpression: '!$(options:useVar)',
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'sourceVar',
					regex: '',
					useVariables: { local: true },
					default: '0',
					isVisibleExpression: '!!$(options:useVar)',
				},
				{
					type: 'checkbox',
					label: 'Use Variable?',
					id: 'useVar',
					default: false,
				},
			],
			callback: setSelectedSource(self, emberClient, config, state, queue),
		},
		[ActionId.SetSelectedTarget]: {
			name: 'Set Selected Target',
			options: [
				{
					type: 'number',
					label: 'Select Matrix Number',
					id: 'matrix',
					required: true,
					min: -0,
					max: 0xffffffff,
					default: 0,
					isVisibleExpression: '!$(options:useVar)',
				},
				{
					type: 'textinput',
					label: 'Select Matrix Number',
					id: 'matrixVar',
					regex: '',
					useVariables: { local: true },
					default: '0',
					isVisibleExpression: '!!$(options:useVar)',
				},
				{
					type: 'number',
					label: 'Value',
					id: 'target',
					required: true,
					min: -0,
					max: 0xffffffff,
					default: 0,
					isVisibleExpression: '!$(options:useVar)',
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'targetVar',
					regex: '',
					useVariables: { local: true },
					default: '0',
					isVisibleExpression: '!!$(options:useVar)',
				},
				{
					type: 'checkbox',
					label: 'Use Variable?',
					id: 'useVar',
					default: false,
				},
			],
			callback: setSelectedTarget(self, state),
		},
	}

	return actions
}
