import Foundation

private let vectorFile: Data = {
    guard let data = try? Data(contentsOf: repositoryRoot.appendingPathComponent("spec/push-payload/vectors.json"))
    else { fatalError("Can't read spec/push-payload/vectors.json") }
    return data
}()

// The APNs payload of a push payload contract vector, with changes to its convohop object, for example to address it
// to a test user.
func apnsPayload(_ id: String, _ changes: [String: Any] = [:]) -> [AnyHashable: Any] {
    guard let file = try? JSONSerialization.jsonObject(with: vectorFile) as? [String: Any],
        let vectors = file["vectors"] as? [[String: Any]],
        let vector = vectors.first(where: { $0["id"] as? String == id }),
        let expected = vector["expected"] as? [String: Any],
        let alert = expected["apnsAlert"] as? [String: Any],
        let request = alert["request"] as? [String: Any],
        var payload = request["payload"] as? [String: Any],
        let convohop = payload["convohop"] as? [String: Any]
    else { fatalError("No push payload vector \(id) with an APNs payload") }
    payload["convohop"] = convohop.merging(changes) { _, change in change }
    return payload
}

// A field of a vector's convohop object.
func vectorField(_ id: String, _ name: String) -> String {
    guard let value = (apnsPayload(id)["convohop"] as? [String: Any])?[name] as? String else {
        fatalError("Push payload vector \(id) has no \(name)")
    }
    return value
}
