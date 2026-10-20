#import <Foundation/Foundation.h>
#import <React/RCTInvalidating.h>
#import <RNRelaySpec/RNRelaySpec.h>

#if __has_include("RelayReactNative-Swift.h")
#import "RelayReactNative-Swift.h"
#else
#import <RelayReactNative/RelayReactNative-Swift.h>
#endif

// The RelayPush TurboModule: APNs registration and Relay notifications. Its Swift half, RelayPushBridge, runs
// on the main thread, which is this module's method queue.
@interface RelayPushModule
    : NativeRelayPushSpecBase <NativeRelayPushSpec, RCTInvalidating, RelayPushEmitter>
@end

@implementation RelayPushModule {
  RelayPushBridge *_bridge;
}

+ (NSString *)moduleName
{
  return @"RelayPush";
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  if ((self = [super init])) {
    _bridge = [RelayPushBridge new];
  }
  return self;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper
{
  [super setEventEmitterCallback:eventEmitterCallbackWrapper];
  // Emitting throws until the callback is set, so the bridge emits only once it's attached.
  __weak RelayPushModule *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    RelayPushModule *strongSelf = weakSelf;
    if (strongSelf != nil) {
      [strongSelf->_bridge attachEmitter:strongSelf];
    }
  });
}

- (void)invalidate
{
  [_bridge invalidate];
}

- (void)getPermissionStatus:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge getPermissionStatus:resolve reject:reject];
}

- (void)requestPermission:(JS::NativeRelayPush::PermissionRequest &)request
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  [_bridge requestPermission:request.alert()
                       badge:request.badge()
                       sound:request.sound()
                 provisional:request.provisional()
                     resolve:resolve
                      reject:reject];
}

- (void)register:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge register:resolve reject:reject];
}

- (void)unregister:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_UNSUPPORTED", @"iOS apps don't unregister from APNs; delete the registration from your backend", nil);
}

- (void)setRecipient:(NSDictionary *_Nullable)recipient
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  [_bridge setRecipient:recipient resolve:resolve reject:reject];
}

- (void)getRegistrations:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge getRegistrations:resolve reject:reject];
}

- (void)takeInitialNotification:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge takeInitialNotification:resolve reject:reject];
}

- (void)handleRemoteMessage:(NSString *)dataJson
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_UNSUPPORTED", @"iOS delivers Relay pushes through the notification center delegate", nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeRelayPushSpecJSI>(params);
}

@end
