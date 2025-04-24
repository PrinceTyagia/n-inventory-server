export const checkSubscriptionStatus = (org: any): boolean => {
  if (!org.subscriptionEndsAt || !org.orgStatus) {
    console.log("Missing subscriptionEndsAt or orgStatus");
    return false;
  }

  const currentDate = new Date();
  const subscriptionExpiry = new Date(org.subscriptionEndsAt);
 


  const isActive = subscriptionExpiry > currentDate && org.orgStatus === 'verified';


  return isActive;
};
  export const updateLastLoginTime = async (user: any) => {
    try {
      user.lastLoginTime = new Date(); // Update with the current time
      await user.save(); // Save the updated user record
    } catch (error) {
      console.error('Error updating last login time:', error);
    }
  };
  