//
//  FeatureFlags.swift
//  BankaiCore
//
//  Created by Sergio Daniel on 5/02/25.
//

public enum FeatureFlagState: Codable {
    case enabled
    case disabled
    case undetermined
}

public struct FeatureFlag: Codable, Hashable {
    let name: String
    
    /// Creates a new feature flag.
    public init(name: String) {
        self.name = name
    }
}

/// Represents a feature flag assignment.
public struct FeatureFlagAssignment: Codable, Hashable {
    public let flag: FeatureFlag
    public var state: FeatureFlagState
    
    /// Creates a new feature flag assignment.
    public init(flag: FeatureFlag, state: FeatureFlagState) {
        self.flag = flag
        self.state = state
    }
}

public protocol FeatureFlagService {
    
    /// Creates a closure that returns the state of a feature flag.
    /// - Parameter featureFlag: The feature flag to check.
    /// - Returns: A closure that returns the state of the feature flag.
    func enabledResolver(_ featureFlag: FeatureFlag) -> () -> Bool
    
    /// Checks if a feature flag is enabled.
    /// - Parameter featureFlag: The feature flag to check.
    /// - Returns: A boolean indicating whether the feature flag is enabled.
    func state(for featureFlag: FeatureFlag) -> FeatureFlagState?
    
    /// Changes the state of a feature flag.
    /// - Parameters:
    ///  - featureFlag: The feature flag to change.
    ///  - state: The new state of the feature flag.
    mutating func change(ff featureFlag: FeatureFlag, to state: FeatureFlagState)
}
