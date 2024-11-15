/**
 * @file server/src/models/User.js
 * @description Mongoose schema and model for the User collection.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * @schema UserSchema
 * @description Defines the structure of a user document in the database.
 */
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long.'],
      maxlength: [20, 'Username cannot be more than 20 characters long.'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address.',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters long.'],
      select: false, // Do not return password field in queries by default
    },
    profile: {
      firstName: {
        type: String,
        trim: true,
        maxlength: [50, 'First name cannot be more than 50 characters.'],
        default: '',
      },
      lastName: {
        type: String,
        trim: true,
        maxlength: [50, 'Last name cannot be more than 50 characters.'],
        default: '',
      },
      bio: {
        type: String,
        maxlength: [160, 'Bio cannot be more than 160 characters.'],
        default: '',
      },
      location: {
        type: String,
        trim: true,
        maxlength: [100, 'Location cannot be more than 100 characters.'],
        default: '',
      },
      website: {
        type: String,
        trim: true,
        maxlength: [100, 'Website URL cannot be more than 100 characters.'],
        default: '',
      },
    },
    avatar: {
      type: String,
      default: 'https://i.pravatar.cc/150?u=default', // Placeholder default avatar
    },
    coverPhoto: {
      type: String,
      default: '', // No default cover photo
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true }, // Ensure virtuals are included in JSON output
    toObject: { virtuals: true }, // Ensure virtuals are included in object output
  }
);

// --- VIRTUALS ---

/**
 * @virtual fullName
 * @description A virtual property to get the user's full name.
 */
UserSchema.virtual('fullName').get(function () {
  if (this.profile && this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  if (this.profile && this.profile.firstName) {
    return this.profile.firstName;
  }
  return this.username;
});

/**
 * @virtual followerCount
 * @description A virtual property to get the number of followers.
 */
UserSchema.virtual('followerCount').get(function () {
  return this.followers ? this.followers.length : 0;
});

/**
 * @virtual followingCount
 * @description A virtual property to get the number of users being followed.
 */
UserSchema.virtual('followingCount').get(function () {
  return this.following ? this.following.length : 0;
});

// --- INDEXES ---

// Create indexes for frequently queried fields to improve performance.
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });

// --- MIDDLEWARE (HOOKS) ---

/**
 * @middleware pre('save')
 * @description Hashes the user's password before saving it to the database.
 * This middleware only runs if the password field has been modified.
 */
UserSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with a cost factor of 12
  this.password = await bcrypt.hash(this.password, 12);

  // If this is not a new document and the password is modified,
  // set the passwordChangedAt field. Subtract 1 second to ensure
  // the token is always created after the password is changed.
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});

// --- INSTANCE METHODS ---

/**
 * @method comparePassword
 * @description Compares a candidate password with the user's hashed password.
 * @param {string} candidatePassword - The password to compare.
 * @returns {Promise<boolean>} - True if the passwords match, false otherwise.
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * @method generateAuthToken
 * @description Generates a JSON Web Token (JWT) for user authentication.
 * @returns {string} - The generated JWT.
 */
UserSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * @method createPasswordResetToken
 * @description Generates a token for password reset functionality.
 * The token is hashed before being saved to the database for security.
 * @returns {string} - The unhashed reset token to be sent to the user.
 */
UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set token to expire in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

/**
 * @method changedPasswordAfter
 * @description Checks if the user changed their password after a given JWT was issued.
 * @param {number} JWTTimestamp - The timestamp from the decoded JWT (iat property).
 * @returns {boolean} - True if the password was changed after the token was issued.
 */
UserSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  // False means password was not changed after token was issued
  return false;
};

const User = mongoose.model('User', UserSchema);

module.exports = User;