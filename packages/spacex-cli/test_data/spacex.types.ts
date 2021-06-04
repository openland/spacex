/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: DiscoverDevices
// ====================================================

export interface DiscoverDevices_discover {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface DiscoverDevices {
  discover: DiscoverDevices_discover[];
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: UpdateDeviceDescription
// ====================================================

export interface UpdateDeviceDescription_updateDeviceDescription_Lock_addedBy {
  __typename: "User";
  id: string;
  username: string;
}

export interface UpdateDeviceDescription_updateDeviceDescription_Lock {
  id: string;
  description: string | null;
  addedBy: UpdateDeviceDescription_updateDeviceDescription_Lock_addedBy;
}

export interface UpdateDeviceDescription_updateDeviceDescription_Lamp_addedBy {
  __typename: "User";
  id: string;
  username: string;
}

export interface UpdateDeviceDescription_updateDeviceDescription_Lamp {
  id: string;
  description: string | null;
  addedBy: UpdateDeviceDescription_updateDeviceDescription_Lamp_addedBy;
  brightness: number;
  minBrightness: number;
  maxBrightness: number;
}

export interface UpdateDeviceDescription_updateDeviceDescription_Switch_addedBy {
  __typename: "User";
  id: string;
  username: string;
}

export interface UpdateDeviceDescription_updateDeviceDescription_Switch {
  id: string;
  description: string | null;
  addedBy: UpdateDeviceDescription_updateDeviceDescription_Switch_addedBy;
  numberOfButtons: number | null;
}

export type UpdateDeviceDescription_updateDeviceDescription = UpdateDeviceDescription_updateDeviceDescription_Lock | UpdateDeviceDescription_updateDeviceDescription_Lamp | UpdateDeviceDescription_updateDeviceDescription_Switch;

export interface UpdateDeviceDescription {
  updateDeviceDescription: UpdateDeviceDescription_updateDeviceDescription;
}

export interface UpdateDeviceDescriptionVariables {
  id: string;
  description: DeviceDescription;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: AddUser
// ====================================================

export interface AddUser_addUser {
  id: string;
}

export interface AddUser {
  addUser: AddUser_addUser;
}

export interface AddUserVariables {
  username: string;
  password: string;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: UserShort
// ====================================================

export interface UserShort {
  id: string;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: LampShort
// ====================================================

export interface LampShort {
  id: string;
  brightness: number;
  minBrightness: number;
  maxBrightness: number;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: DeviceNano
// ====================================================

export interface DeviceNano {
  id: string;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: DeviceShort
// ====================================================

export interface DeviceShort_Lock_addedBy {
  __typename: "User";
  id: string;
  username: string;
}

export interface DeviceShort_Lock {
  id: string;
  description: string | null;
  addedBy: DeviceShort_Lock_addedBy;
}

export interface DeviceShort_Lamp_addedBy {
  __typename: "User";
  id: string;
  username: string;
}

export interface DeviceShort_Lamp {
  id: string;
  description: string | null;
  addedBy: DeviceShort_Lamp_addedBy;
  brightness: number;
  minBrightness: number;
  maxBrightness: number;
}

export interface DeviceShort_Switch_addedBy {
  __typename: "User";
  id: string;
  username: string;
}

export interface DeviceShort_Switch {
  id: string;
  description: string | null;
  addedBy: DeviceShort_Switch_addedBy;
  numberOfButtons: number | null;
}

export type DeviceShort = DeviceShort_Lock | DeviceShort_Lamp | DeviceShort_Switch;

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export interface DeviceDescription {
  name?: string | null;
  description?: string | null;
  icon?: ImageRef | null;
}

export interface ImageRef {
  url: string;
}

//==============================================================
// END Enums and Input Objects
//==============================================================
