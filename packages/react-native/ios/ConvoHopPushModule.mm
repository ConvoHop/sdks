#import <Foundation/Foundation.h>
#import <React/RCTInvalidating.h>
#import <RNConvoHopSpec/RNConvoHopSpec.h>

#if __has_include("ConvoHopReactNative-Swift.h")
#import "ConvoHopReactNative-Swift.h"
#else
#import <ConvoHopReactNative/ConvoHopReactNative-Swift.h>
#endif

// The ConvoHopPush TurboModule: APNs registration and ConvoHop notifications. Its Swift half, ConvoHopPushBridge, runs
// on the main thread, which is this module's method queue.
@interface ConvoHopPushModule
    : NativeConvoHopPushSpecBase <NativeConvoHopPushSpec, RCTInvalidating, ConvoHopPushEmitter>
@end

@implementation ConvoHopPushModule {
  ConvoHopPushBridge *_bridge;
}

+ (NSString *)moduleName
{
  return @"ConvoHopPush";
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  if ((self = [super init])) {
    _bridge = [ConvoHopPushBridge new];
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
  __weak ConvoHopPushModule *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    ConvoHopPushModule *strongSelf = weakSelf;
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

- (void)requestPermission:(JS::NativeConvoHopPush::PermissionRequest &)request
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
  reject(@"E_UNSUPPORTED", @"iOS delivers ConvoHop pushes through the notification center delegate", nil);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeConvoHopPushSpecJSI>(params);
}

@end
