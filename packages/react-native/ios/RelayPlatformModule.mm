#import <Foundation/Foundation.h>
#import <RNRelaySpec/RNRelaySpec.h>
#import <Security/Security.h>

#include <cmath>

static const double RelayMaxRandomBytes = 65536;

// The RelayPlatform TurboModule: what @instantrelay/react-native needs from iOS that Hermes lacks.
@interface RelayPlatformModule : NativeRelayPlatformSpecBase <NativeRelayPlatformSpec>
@end

@implementation RelayPlatformModule

+ (NSString *)moduleName
{
  return @"RelayPlatform";
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

// `length` (1–65536) cryptographically secure random bytes, as Base64.
- (NSString *)getRandomBytes:(double)length
{
  if (!(length >= 1 && length <= RelayMaxRandomBytes) || length != std::floor(length)) {
    @throw [NSException exceptionWithName:NSInvalidArgumentException
                                   reason:@"length must be an integer from 1 to 65536"
                                 userInfo:nil];
  }
  NSMutableData *bytes = [NSMutableData dataWithLength:(NSUInteger)length];
  if (SecRandomCopyBytes(kSecRandomDefault, bytes.length, bytes.mutableBytes) != errSecSuccess) {
    @throw [NSException exceptionWithName:NSInternalInconsistencyException
                                   reason:@"The system random number generator failed"
                                 userInfo:nil];
  }
  return [bytes base64EncodedStringWithOptions:0];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeRelayPlatformSpecJSI>(params);
}

@end
