package AA_Maps_Accidents;

public class ConstantAttenuation implements IAttenuation {
	
	private float unit;
	private float effect; 

	public ConstantAttenuation(float effect, float unit) {
		this.unit = unit;
		this.effect = effect;
	}
	
	@Override
	public float attenuate() {
		float val = effect - unit;
		return (val > 0 ? val : 0);
	}

	@Override
	public void setEffectValue(float effect) {
		this.effect = effect;
	}
	
	@Override
	public float getAttenuatedValue() {
		return this.effect;
	}
}
