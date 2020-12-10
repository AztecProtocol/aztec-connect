This api returns a [WalletSdkUser](/#/Types/WalletSdkUser), which has all the user specific methods.

@spec sdk.ts getUser

```js
function demoGetUser(aztecSdk, userId) {
  const user = aztecSdk.getUser(userId);

  const data = user.getUserData();
  // equivalent to aztecSdk.getUserData(userId);
  console.info(data);
}
```

## getUsersData

This api returns [UserData](/#/Types/UserData) of all the users that've been added to the current device.

@spec sdk.ts getUsersData


```js
function demoGetUsersData(aztecSdk) {
  const users = aztecSdk.getUsersData();
  console.info(users);
}
```

## See Also

- **[WalletSdkUser](/#/Types/WalletSdkUser)**
